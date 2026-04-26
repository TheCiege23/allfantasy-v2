import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildRateLimit429, consumeRateLimit, getClientIp } from '@/lib/rate-limit'
import {
  ChimmyAIAnalyticsEventSchema,
  persistChimmyAIAnalyticsEvent,
} from '@/lib/chimmy-chat/analytics-events'

const USER_EVENTS_LIMIT = 90
const USER_EVENTS_WINDOW_MS = 60_000
const BURST_EVENTS_LIMIT = 24
const BURST_EVENTS_WINDOW_MS = 10_000
const MAX_CONTENT_LENGTH_BYTES = 32_000
const PERSIST_TIMEOUT_MS = 1_200

function buildBaseHeaders(durationMs: number): Record<string, string> {
  return {
    'Cache-Control': 'no-store',
    'Server-Timing': `chimmy_ai_events;dur=${durationMs}`,
    'X-Chimmy-Analytics-Latency-Ms': String(durationMs),
  }
}

function buildRateLimitHeaders(args: {
  limit: number
  remaining: number
  resetTimeMs: number
  durationMs: number
}): Record<string, string> {
  return {
    ...buildBaseHeaders(args.durationMs),
    'X-RateLimit-Limit': String(args.limit),
    'X-RateLimit-Remaining': String(Math.max(0, args.remaining)),
    'X-RateLimit-Reset': String(Math.ceil(args.resetTimeMs / 1000)),
  }
}

export async function POST(req: NextRequest) {
  const startedAtMs = Date.now()
  const ip = getClientIp(req)
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const sessionUserId = session?.user?.id
  if (!sessionUserId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: buildBaseHeaders(Date.now() - startedAtMs),
      }
    )
  }

  const contentLengthRaw = req.headers.get('content-length')
  const contentLength = contentLengthRaw ? Number(contentLengthRaw) : null
  if (contentLength && Number.isFinite(contentLength) && contentLength > MAX_CONTENT_LENGTH_BYTES) {
    return NextResponse.json(
      {
        error: 'Payload too large',
        maxBytes: MAX_CONTENT_LENGTH_BYTES,
      },
      {
        status: 413,
        headers: buildBaseHeaders(Date.now() - startedAtMs),
      }
    )
  }

  const rateLimitResult = consumeRateLimit({
    scope: 'chimmy',
    action: 'ai_events',
    sleeperUsername: sessionUserId,
    ip,
    maxRequests: USER_EVENTS_LIMIT,
    windowMs: USER_EVENTS_WINDOW_MS,
    includeIpInKey: true,
  })

  const burstRateLimitResult = consumeRateLimit({
    scope: 'chimmy',
    action: 'ai_events_burst',
    sleeperUsername: sessionUserId,
    ip,
    maxRequests: BURST_EVENTS_LIMIT,
    windowMs: BURST_EVENTS_WINDOW_MS,
    includeIpInKey: true,
  })

  if (!rateLimitResult.success || !burstRateLimitResult.success) {
    const failedLimit = !burstRateLimitResult.success ? burstRateLimitResult : rateLimitResult
    const failedLimitMax = !burstRateLimitResult.success ? BURST_EVENTS_LIMIT : USER_EVENTS_LIMIT
    return NextResponse.json(
      buildRateLimit429({
        message: 'Too many analytics events. Please retry shortly.',
        rl: failedLimit,
      }),
      {
        status: 429,
        headers: {
          ...buildRateLimitHeaders({
            limit: failedLimitMax,
            remaining: failedLimit.remaining,
            resetTimeMs: failedLimit.resetTimeMs,
            durationMs: Date.now() - startedAtMs,
          }),
          'Retry-After': String(failedLimit.retryAfterSec),
        },
      }
    )
  }

  const body = await req.json().catch(() => ({}))
  const parsed = ChimmyAIAnalyticsEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid body',
        details: parsed.error.flatten(),
      },
      {
        status: 400,
        headers: buildRateLimitHeaders({
          limit: USER_EVENTS_LIMIT,
          remaining: rateLimitResult.remaining,
          resetTimeMs: rateLimitResult.resetTimeMs,
          durationMs: Date.now() - startedAtMs,
        }),
      }
    )
  }

  if (parsed.data.user_id && parsed.data.user_id !== sessionUserId) {
    return NextResponse.json(
      { error: 'Forbidden' },
      {
        status: 403,
        headers: buildRateLimitHeaders({
          limit: USER_EVENTS_LIMIT,
          remaining: rateLimitResult.remaining,
          resetTimeMs: rateLimitResult.resetTimeMs,
          durationMs: Date.now() - startedAtMs,
        }),
      }
    )
  }

  const writeResult = (await Promise.race([
    persistChimmyAIAnalyticsEvent({
      ...parsed.data,
      user_id: sessionUserId,
    }),
    new Promise<{ ok: false; error: 'timeout' }>((resolve) => {
      setTimeout(() => resolve({ ok: false, error: 'timeout' }), PERSIST_TIMEOUT_MS)
    }),
  ])) as Awaited<ReturnType<typeof persistChimmyAIAnalyticsEvent>> | { ok: false; error: 'timeout' }

  if (!writeResult.ok && writeResult.error === 'timeout') {
    return NextResponse.json(
      {
        ok: true,
        accepted: true,
        persisted: false,
        reason: 'analytics_persist_timeout',
      },
      {
        status: 202,
        headers: buildRateLimitHeaders({
          limit: USER_EVENTS_LIMIT,
          remaining: rateLimitResult.remaining,
          resetTimeMs: rateLimitResult.resetTimeMs,
          durationMs: Date.now() - startedAtMs,
        }),
      }
    )
  }

  if (!writeResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to persist event',
      },
      {
        status: 500,
        headers: buildRateLimitHeaders({
          limit: USER_EVENTS_LIMIT,
          remaining: rateLimitResult.remaining,
          resetTimeMs: rateLimitResult.resetTimeMs,
          durationMs: Date.now() - startedAtMs,
        }),
      }
    )
  }

  return NextResponse.json(
    { ok: true },
    {
      headers: buildRateLimitHeaders({
        limit: USER_EVENTS_LIMIT,
        remaining: rateLimitResult.remaining,
        resetTimeMs: rateLimitResult.resetTimeMs,
        durationMs: Date.now() - startedAtMs,
      }),
    }
  )
}

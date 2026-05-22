/**
 * Per-user, per-feature daily AI usage caps.
 *
 * Reuses the existing ApiRateLimitRecord table (daily window, no migration needed).
 * Fail-open: if DB is unavailable, the call is allowed so users aren't blocked.
 */
import 'server-only'

import { createHash } from 'node:crypto'

import { prisma } from '@/lib/prisma'

// ── Cap limits ────────────────────────────────────────────────────────────────

export type CapFeature = 'chimmy' | 'explain_bracket' | 'commissioner_brain'
export type CapTier = 'free' | 'pro'

export const DAILY_CAP_LIMITS: Record<CapFeature, Record<CapTier, number>> = {
  chimmy:              { free: 10, pro: 30 },
  explain_bracket:     { free: 2,  pro: 5  },
  commissioner_brain:  { free: 0,  pro: 5  },
}

export interface DailyCapResult {
  allowed: boolean
  used: number
  limit: number
  resetsAt: Date
  /** Friendly message to surface when cap is exceeded */
  message: string
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const CAP_PROVIDER = 'ai_daily'

function hashUserId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex').slice(0, 20)
}

function buildEndpoint(feature: CapFeature, userId: string): string {
  return `${feature}:${hashUserId(userId)}`
}

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function endOfUtcDay(d = new Date()): Date {
  return new Date(startOfUtcDay(d).getTime() + 24 * 60 * 60 * 1000)
}

function capExceededMessage(feature: CapFeature): string {
  if (feature === 'explain_bracket') {
    return "You've reached today's bracket explanation limit. Try again tomorrow or upgrade for more AI help."
  }
  return "You've reached today's Chimmy limit. Try again tomorrow or upgrade for more AI help."
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check whether a user may make one more AI call for the given feature.
 * Never throws — returns allowed:true on DB error.
 */
export async function checkDailyCap(
  feature: CapFeature,
  userId: string,
  tier: CapTier
): Promise<DailyCapResult> {
  const limit = DAILY_CAP_LIMITS[feature][tier]
  const now = new Date()
  const windowStart = startOfUtcDay(now)
  const windowEnd = endOfUtcDay(now)

  // A limit of 0 means the feature is not available for this tier.
  if (limit === 0) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      resetsAt: windowEnd,
      message: capExceededMessage(feature),
    }
  }

  try {
    const record = await prisma.apiRateLimitRecord.findFirst({
      where: {
        provider: CAP_PROVIDER,
        endpoint: buildEndpoint(feature, userId),
        windowStart,
        windowEnd,
      },
      select: { callsMade: true },
    })

    const used = record?.callsMade ?? 0
    return {
      allowed: used < limit,
      used,
      limit,
      resetsAt: windowEnd,
      message: capExceededMessage(feature),
    }
  } catch {
    // Fail open so a DB hiccup never blocks users.
    return { allowed: true, used: 0, limit, resetsAt: windowEnd, message: '' }
  }
}

/**
 * Increment the daily cap counter for a user after a successful AI call.
 * Never throws.
 */
export async function incrementDailyCap(
  feature: CapFeature,
  userId: string,
  tier: CapTier
): Promise<void> {
  const limit = DAILY_CAP_LIMITS[feature][tier]
  const now = new Date()
  const windowStart = startOfUtcDay(now)
  const windowEnd = endOfUtcDay(now)
  const endpoint = buildEndpoint(feature, userId)

  try {
    await prisma.apiRateLimitRecord.upsert({
      where: {
        uniq_api_rate_limits_window: {
          provider: CAP_PROVIDER,
          endpoint,
          windowStart,
          windowEnd,
        },
      },
      update: { callsMade: { increment: 1 }, callsLimit: limit },
      create: {
        provider: CAP_PROVIDER,
        endpoint,
        callsMade: 1,
        callsLimit: limit,
        windowStart,
        windowEnd,
      },
    })
  } catch {
    // Never fail the user path because quota logging had an issue.
  }
}

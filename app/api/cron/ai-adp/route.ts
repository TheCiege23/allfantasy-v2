/**
 * Cron: run AI ADP job (aggregate draft picks, compute ADP, persist snapshots + history).
 * Call daily at a defined time (Vercel cron or external scheduler).
 * Supports GET (scheduler) and POST (manual override body), both requiring cron/admin secret.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runAiAdpJob } from '@/lib/ai-adp-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const DEFAULT_DAILY_SCHEDULE_UTC = '0 6 * * *'

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function requireCron(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') ?? ''
  const provided =
    req.headers.get('x-cron-secret') ??
    req.headers.get('x-admin-secret') ??
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '') ??
    ''
  const cronSecret = process.env.AI_ADP_CRON_SECRET ?? process.env.LEAGUE_CRON_SECRET ?? process.env.CRON_SECRET
  const adminSecret = process.env.BRACKET_ADMIN_SECRET || process.env.ADMIN_PASSWORD
  return !!(
    provided &&
    ((cronSecret && provided === cronSecret) ||
      (adminSecret && provided === adminSecret))
  )
}

async function runCronJob(req: NextRequest, body: Record<string, unknown>) {
  if (!requireCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = body.since
    ? new Date(String(body.since))
    : undefined
  const lookbackDays = clampInt(
    Number(body.lookbackDays ?? process.env.AI_ADP_LOOKBACK_DAYS ?? 120),
    30,
    365
  )
  const lowSampleThreshold = clampInt(
    Number(body.lowSampleThreshold ?? process.env.AI_ADP_LOW_SAMPLE_THRESHOLD ?? 5),
    2,
    25
  )
  const minSampleSize = clampInt(
    Number(body.minSampleSize ?? process.env.AI_ADP_MIN_SAMPLE_SIZE ?? 2),
    1,
    25
  )
  const scheduledAtUtc = String(
    process.env.AI_ADP_DAILY_CRON_UTC ?? DEFAULT_DAILY_SCHEDULE_UTC
  )

  try {
    const result = await runAiAdpJob({
      since,
      lookbackDays,
      lowSampleThreshold,
      minSampleSize,
      runReason: req.method === 'GET' ? 'cron:get' : 'cron:post',
      scheduledAtUtc,
    })
    return NextResponse.json({
      ok: true,
      scheduleUtc: scheduledAtUtc,
      lookbackDays,
      lowSampleThreshold,
      minSampleSize,
      cutoffApplied: result.cutoffApplied,
      segmentsConsidered: result.segmentsConsidered,
      segmentsUpdated: result.segmentsUpdated,
      totalPicksProcessed: result.totalPicksProcessed,
      errors: result.errors,
    })
  } catch (e) {
    console.error('[cron/ai-adp]', e)
    return NextResponse.json(
      { error: (e as Error).message ?? 'AI ADP job failed' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return runCronJob(req, {})
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  return runCronJob(req, body)
}

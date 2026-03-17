/**
 * Cron: run AI ADP job (aggregate draft picks, compute ADP, persist snapshots).
 * Call daily at a defined time (e.g. via Vercel cron or external scheduler).
 * Requires x-cron-secret or x-admin-secret header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runAiAdpJob } from '@/lib/ai-adp-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function requireCron(req: NextRequest): boolean {
  const provided =
    req.headers.get('x-cron-secret') ??
    req.headers.get('x-admin-secret') ??
    ''
  const cronSecret = process.env.LEAGUE_CRON_SECRET
  const adminSecret = process.env.BRACKET_ADMIN_SECRET || process.env.ADMIN_PASSWORD
  return !!(
    provided &&
    ((cronSecret && provided === cronSecret) ||
      (adminSecret && provided === adminSecret))
  )
}

export async function POST(req: NextRequest) {
  if (!requireCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const since = body.since
    ? new Date(body.since)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const lowSampleThreshold = typeof body.lowSampleThreshold === 'number'
    ? body.lowSampleThreshold
    : 5

  try {
    const result = await runAiAdpJob(since, lowSampleThreshold)
    return NextResponse.json({
      ok: true,
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

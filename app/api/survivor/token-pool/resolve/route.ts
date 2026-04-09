import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { resolveTokenPoolPicks } from '@/lib/survivor/tokenPoolEngine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/survivor/token-pool/resolve
 * Resolves token pool picks for a given league/week against game results.
 * Called by cron or commissioner manually.
 */
export async function POST(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : ''
  const week = typeof body.week === 'number' ? body.week : 0
  const results = typeof body.results === 'object' && body.results != null
    ? body.results as Record<string, { winner?: string; totalScore?: number; correct?: boolean }>
    : {}

  if (!leagueId || !week) {
    return NextResponse.json({ error: 'leagueId and week required' }, { status: 400 })
  }

  const outcomes = await resolveTokenPoolPicks(leagueId, week, results)
  return NextResponse.json({ ok: true, resolved: outcomes.length, outcomes })
}

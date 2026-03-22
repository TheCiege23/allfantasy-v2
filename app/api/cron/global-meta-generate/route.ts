/**
 * POST /api/cron/global-meta-generate
 * Scheduled Global Meta snapshot generation across supported sports.
 */

import { NextRequest, NextResponse } from 'next/server'
import { GlobalMetaEngine } from '@/lib/global-meta-engine'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { normalizeTimeframe } from '@/lib/global-meta-engine/timeframe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function requireCron(req: Request): boolean {
  const provided = req.headers.get('x-cron-secret') ?? req.headers.get('x-admin-secret') ?? ''
  const cronSecret = process.env.GLOBAL_META_CRON_SECRET ?? process.env.CRON_SECRET
  const adminSecret = process.env.BRACKET_ADMIN_SECRET ?? process.env.ADMIN_PASSWORD
  return !!(
    provided &&
    ((cronSecret && provided === cronSecret) || (adminSecret && provided === adminSecret))
  )
}

export async function POST(req: NextRequest) {
  if (!requireCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const sportParam = url.searchParams.get('sport')
  const sport = sportParam ? normalizeToSupportedSport(sportParam) : undefined
  const season = url.searchParams.get('season') ?? String(new Date().getUTCFullYear())
  const timeframe = normalizeTimeframe(url.searchParams.get('timeframe'))
  const weekRaw = url.searchParams.get('week') ?? url.searchParams.get('weekOrPeriod')
  const parsedWeek = weekRaw ? Number.parseInt(weekRaw, 10) : NaN
  const weekOrPeriod = Number.isFinite(parsedWeek) ? parsedWeek : undefined

  try {
    const snapshots = sport
      ? await GlobalMetaEngine.generateSnapshots({
          sport,
          season,
          weekOrPeriod,
          timeframe,
        })
      : await GlobalMetaEngine.generateAllSnapshots(season)
    return NextResponse.json(
      { ok: true, sport: sport ?? 'all', season, weekOrPeriod: weekOrPeriod ?? 0, snapshots },
      { headers: { 'Cache-Control': 'no-cache, no-store' } }
    )
  } catch (err) {
    console.error('[cron/global-meta-generate]', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Global meta generation failed' },
      { status: 500 }
    )
  }
}

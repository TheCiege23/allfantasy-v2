/**
 * POST /api/cron/strategy-meta-generate
 * Scheduled Strategy Meta report generation across supported sports.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateStrategyMetaReports } from '@/lib/strategy-meta'
import { isSupportedSport, normalizeToSupportedSport, SUPPORTED_SPORTS } from '@/lib/sport-scope'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function requireCron(req: Request): boolean {
  const provided = req.headers.get('x-cron-secret') ?? req.headers.get('x-admin-secret') ?? ''
  const cronSecret = process.env.STRATEGY_META_CRON_SECRET ?? process.env.CRON_SECRET
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
  const sportParam = url.searchParams.get('sport') ?? undefined
  if (sportParam && !isSupportedSport(sportParam)) {
    return NextResponse.json({ error: 'Invalid sport', supported: SUPPORTED_SPORTS }, { status: 400 })
  }
  const sport = sportParam ? normalizeToSupportedSport(sportParam) : undefined
  const leagueFormat = url.searchParams.get('leagueFormat') ?? undefined
  const dryRun = url.searchParams.get('dryRun') === '1' || url.searchParams.get('dryRun') === 'true'
  const includeDiagnostics =
    url.searchParams.get('includeDiagnostics') === '1' ||
    url.searchParams.get('includeDiagnostics') === 'true'

  try {
    const result = await generateStrategyMetaReports({
      sport: sport as any,
      leagueFormat: leagueFormat as any,
      dryRun,
      includeDiagnostics,
    })

    return NextResponse.json(
      { ok: result.reports > 0 || result.errors.length === 0, dryRun, ...result },
      { headers: { 'Cache-Control': 'no-cache, no-store' } }
    )
  } catch (err) {
    console.error('[cron/strategy-meta-generate]', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Strategy meta generation failed' },
      { status: 500 }
    )
  }
}

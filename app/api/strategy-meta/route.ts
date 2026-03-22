/**
 * Strategy Meta API — list reports; optionally trigger report generation (admin).
 * GET ?sport=NFL&leagueFormat=dynasty_sf
 * POST (body: { sport?, leagueFormat? }) to generate reports
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStrategyMetaReports, generateStrategyMetaReports } from '@/lib/strategy-meta'
import { isSupportedSport, normalizeToSupportedSport, SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { normalizeTimeframe } from '@/lib/global-meta-engine/timeframe'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sportParam = searchParams.get('sport')
    if (sportParam && !isSupportedSport(sportParam)) {
      return NextResponse.json(
        { error: 'Invalid sport', supported: SUPPORTED_SPORTS },
        { status: 400 }
      )
    }
    const sport = sportParam ? normalizeToSupportedSport(sportParam) : undefined
    const leagueFormat = searchParams.get('leagueFormat') ?? undefined
    const timeframeFilter = normalizeTimeframe(searchParams.get('timeframe'))
    const data = await getStrategyMetaReports({ sport, leagueFormat, timeframe: timeframeFilter })
    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } }
    )
  } catch (e) {
    console.error('Strategy meta GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch strategy meta' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    if (body.sport && !isSupportedSport(body.sport)) {
      return NextResponse.json(
        { error: 'Invalid sport', supported: SUPPORTED_SPORTS },
        { status: 400 }
      )
    }
    const sport = body.sport ? normalizeToSupportedSport(body.sport) : undefined
    const leagueFormat = body.leagueFormat ?? undefined
    const leagueIds = Array.isArray(body.leagueIds) ? body.leagueIds : undefined
    const dryRun = Boolean(body.dryRun)
    const includeDiagnostics = Boolean(body.includeDiagnostics)
    const result = await generateStrategyMetaReports({
      sport: sport as any,
      leagueFormat: leagueFormat as any,
      leagueIds,
      dryRun,
      includeDiagnostics,
    })
    return NextResponse.json({
      reports: result.reports,
      errors: result.errors,
      dryRun,
      diagnostics: result.diagnostics,
    })
  } catch (e) {
    console.error('Strategy meta POST error:', e)
    return NextResponse.json({ error: 'Failed to generate strategy meta' }, { status: 500 })
  }
}

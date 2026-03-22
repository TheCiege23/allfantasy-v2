/**
 * Strategy Meta Engine API (PROMPT 136).
 * GET ?sport=NFL&leagueFormat=dynasty_sf&windowDays=30
 */
import { NextRequest, NextResponse } from 'next/server'
import { runMetaAnalysis, getMetaAnalysisSupportedSports } from '@/lib/strategy-meta-engine'
import { isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'
import { normalizeTimeframe } from '@/lib/global-meta-engine/timeframe'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sportParam = searchParams.get('sport')?.trim() ?? undefined
    const sport = sportParam ? normalizeToSupportedSport(sportParam) : undefined
    const leagueFormat = searchParams.get('leagueFormat')?.trim() ?? undefined
    const timeframe = normalizeTimeframe(searchParams.get('timeframe'))
    const windowFromTimeframe = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : undefined
    const windowDays = searchParams.get('windowDays') != null
      ? Math.min(90, Math.max(1, parseInt(searchParams.get('windowDays')!, 10) || 30))
      : (windowFromTimeframe ?? 30)

    if (sportParam && !isSupportedSport(sportParam)) {
      return NextResponse.json(
        { error: 'Invalid sport', supported: getMetaAnalysisSupportedSports() },
        { status: 400 }
      )
    }

    const result = await runMetaAnalysis({
      sport,
      leagueFormat,
      windowDays,
    })
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
    })
  } catch (e) {
    console.error('[meta-analysis]', e)
    return NextResponse.json(
      { error: 'Failed to run meta analysis' },
      { status: 500 }
    )
  }
}

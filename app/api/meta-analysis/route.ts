/**
 * Strategy Meta Engine API (PROMPT 136).
 * GET ?sport=NFL&leagueFormat=dynasty_sf&windowDays=30
 */
import { NextRequest, NextResponse } from 'next/server'
import { runMetaAnalysis, getMetaAnalysisSupportedSports } from '@/lib/strategy-meta-engine'
import { isSupportedSport } from '@/lib/sport-scope'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')?.trim() ?? undefined
    const leagueFormat = searchParams.get('leagueFormat')?.trim() ?? undefined
    const windowDays =
      searchParams.get('windowDays') != null
        ? Math.min(90, Math.max(1, parseInt(searchParams.get('windowDays')!, 10) || 30))
        : 30

    if (sport && !isSupportedSport(sport)) {
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
    return NextResponse.json(result)
  } catch (e) {
    console.error('[meta-analysis]', e)
    return NextResponse.json(
      { error: 'Failed to run meta analysis' },
      { status: 500 }
    )
  }
}

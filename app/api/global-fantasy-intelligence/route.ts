/**
 * Global Fantasy Intelligence API (PROMPT 139).
 * GET ?sport=NFL&leagueId=...&season=2025&weekOrPeriod=1&trendLimit=20&metaWindowDays=30&leagueFormat=dynasty_sf
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  getGlobalFantasyInsights,
  getGlobalFantasyInsightsSupportedSports,
} from '@/lib/global-fantasy-intelligence'
import { isSupportedSport } from '@/lib/sport-scope'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')?.trim() ?? undefined
    const leagueId = searchParams.get('leagueId')?.trim() ?? undefined
    const seasonParam = searchParams.get('season')
    const season = seasonParam != null ? parseInt(seasonParam, 10) : undefined
    const weekParam = searchParams.get('weekOrPeriod')
    const weekOrPeriod = weekParam != null ? parseInt(weekParam, 10) : undefined
    const trendLimitParam = searchParams.get('trendLimit')
    const trendLimit = trendLimitParam != null ? parseInt(trendLimitParam, 10) : undefined
    const metaWindowDaysParam = searchParams.get('metaWindowDays')
    const metaWindowDays = metaWindowDaysParam != null ? parseInt(metaWindowDaysParam, 10) : undefined
    const leagueFormat = searchParams.get('leagueFormat')?.trim() ?? undefined

    if (sport && !isSupportedSport(sport)) {
      return NextResponse.json(
        {
          error: 'Invalid sport',
          supported: getGlobalFantasyInsightsSupportedSports(),
        },
        { status: 400 }
      )
    }

    const insights = await getGlobalFantasyInsights({
      sport,
      leagueId: leagueId ?? null,
      season,
      weekOrPeriod,
      trendLimit,
      metaWindowDays,
      leagueFormat: leagueFormat ?? null,
    })
    return NextResponse.json(insights)
  } catch (e) {
    console.error('[global-fantasy-intelligence]', e)
    return NextResponse.json(
      { error: 'Failed to compute global fantasy insights' },
      { status: 500 }
    )
  }
}

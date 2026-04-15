import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import {
  getLiveScoresForSport,
  parseSportQueryParam,
} from '@/lib/sports-live-scores-service'

export const dynamic = 'force-dynamic'

export const GET = withApiUsage({ endpoint: '/api/sports/live-scores', tool: 'SportsLiveScores' })(
  async (request: NextRequest) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const team = searchParams?.get('team')
      const refresh = searchParams?.get('refresh') === 'true'
      const sport = parseSportQueryParam(searchParams?.get('sport'))

      const result = await getLiveScoresForSport({
        sport,
        team,
        forceRefresh: refresh,
      })

      return NextResponse.json({
        sport,
        scores: result.scores,
        count: result.scores.length,
        source: result.source,
        refreshed: result.refreshed,
        hasLiveGames: result.hasLiveGames,
        nextRefreshMs: result.nextRefreshMs,
        fetchedAt: result.fetchedAt,
      })
    } catch (error) {
      console.error('[LiveScores] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch live scores', details: String(error) },
        { status: 500 }
      )
    }
  }
)

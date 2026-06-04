import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import {
  getCachedLiveScoresForSport,
} from '@/lib/sports-live-scores-service'
import { parseSportsRouteSportParam } from '@/lib/sports-route-params'

export const dynamic = 'force-dynamic'

export const GET = withApiUsage({ endpoint: '/api/sports/live-scores', tool: 'SportsLiveScores' })(
  async (request: NextRequest) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const team = searchParams?.get('team')
      let parsedSport: ReturnType<typeof parseSportsRouteSportParam>
      try {
        parsedSport = parseSportsRouteSportParam(searchParams?.get('sport'))
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Unsupported sport',
            message: error instanceof Error ? error.message : 'Unsupported sport',
            supportedSports: ['nfl', 'mlb', 'nba', 'nhl', 'ncaaf', 'ncaab', 'soccer', 'world-cup'],
          },
          { status: 400 }
        )
      }

      const result = await getCachedLiveScoresForSport({
        sport: parsedSport.sport,
        team,
      })

      return NextResponse.json({
        sport: parsedSport.sport,
        requestedSport: parsedSport.requestedSport,
        isWorldCup: parsedSport.isWorldCup,
        scores: result.scores,
        count: result.scores.length,
        source: result.source,
        refreshed: result.refreshed,
        isStale: result.isStale,
        lastSyncedAt: result.lastSyncedAt,
        message: result.message,
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

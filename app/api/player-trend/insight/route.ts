/**
 * AI insight for a single player trend (PROMPT 135).
 * GET ?playerId=...&sport=NFL
 */
import { NextRequest, NextResponse } from 'next/server'
import { getTrendFeedItemForPlayer } from '@/lib/player-trend/TrendDetectionService'
import { getTrendAIInsight } from '@/lib/player-trend/TrendDetectionAI'
import { isSupportedSport } from '@/lib/sport-scope'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')?.trim()
    const sport = searchParams.get('sport')?.trim()

    if (!playerId || !sport) {
      return NextResponse.json(
        { error: 'Missing playerId or sport' },
        { status: 400 }
      )
    }
    if (!isSupportedSport(sport)) {
      return NextResponse.json(
        { error: 'Invalid sport' },
        { status: 400 }
      )
    }

    const item = await getTrendFeedItemForPlayer(playerId, sport)
    if (!item) {
      return NextResponse.json(
        { error: 'No trend data for this player/sport' },
        { status: 404 }
      )
    }

    const insight = await getTrendAIInsight(item)
    return NextResponse.json({
      data: item,
      insight,
    })
  } catch (e) {
    console.error('[player-trend/insight]', e)
    return NextResponse.json(
      { error: 'Failed to fetch trend insight' },
      { status: 500 }
    )
  }
}

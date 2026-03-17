/**
 * Player trend feed (PROMPT 135).
 * GET ?sport=NFL|NBA|...&limit=80&limitPerType=25
 */
import { NextRequest, NextResponse } from 'next/server'
import { getTrendFeed, getTrendFeedSupportedSports } from '@/lib/player-trend'
import { isSupportedSport } from '@/lib/sport-scope'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport') ?? undefined
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '80', 10) || 80))
    const limitPerType = Math.min(50, Math.max(1, parseInt(searchParams.get('limitPerType') ?? '25', 10) || 25))

    if (sport && !isSupportedSport(sport)) {
      return NextResponse.json(
        { error: 'Invalid sport', supported: getTrendFeedSupportedSports() },
        { status: 400 }
      )
    }

    const items = await getTrendFeed({
      sport: sport ?? undefined,
      limit,
      limitPerType,
    })
    return NextResponse.json({
      sport: sport ?? 'all',
      data: items,
    })
  } catch (e) {
    console.error('[player-trend/feed]', e)
    return NextResponse.json({ error: 'Failed to fetch trend feed' }, { status: 500 })
  }
}

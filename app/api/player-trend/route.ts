/**
 * Player Trend API – hottest, rising, fallers for AI and dashboard.
 * GET ?list=hottest|rising|fallers&sport=NFL|NBA|...&limit=50
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  getHottestPlayers,
  getRisingPlayers,
  getFallers,
  getTrendingByDirection,
  getTopTradeInterest,
  getTopDraftFrequency,
  getPlayerTrend,
} from '@/lib/player-trend'
import type { TrendDirection } from '@/lib/player-trend'
import { normalizeTimeframe } from '@/lib/global-meta-engine/timeframe'
import { SUPPORTED_SPORTS, isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')
    const sportParam = searchParams.get('sport')
    const sport = sportParam ? normalizeToSupportedSport(sportParam) : undefined
    const list = searchParams.get('list') ?? 'hottest'
    const direction = searchParams.get('direction') as TrendDirection | null
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50))
    const minScore = searchParams.get('minScore') != null ? parseFloat(searchParams.get('minScore')!) : undefined
    const timeframeFilter = normalizeTimeframe(searchParams.get('timeframe'))

    if (sportParam && !isSupportedSport(sportParam)) {
      return NextResponse.json(
        { error: 'Invalid sport', supported: [...SUPPORTED_SPORTS] },
        { status: 400 }
      )
    }

    if (playerId) {
      if (!sport) {
        return NextResponse.json(
          { error: 'sport is required with playerId' },
          { status: 400 }
        )
      }
      const trend = await getPlayerTrend(playerId, sport)
      return NextResponse.json(trend ? { data: trend } : { error: 'Not found', data: null }, { status: trend ? 200 : 404 })
    }

    const options = { sport, timeframe: timeframeFilter, limit, minScore }

    if (direction && ['Rising', 'Hot', 'Stable', 'Falling', 'Cold'].includes(direction)) {
      const rows = await getTrendingByDirection(direction, options)
      return NextResponse.json({ list: direction, sport: sport ?? 'all', data: rows })
    }

    switch (list) {
      case 'hottest':
        return NextResponse.json({
          list: 'hottest',
          sport: sport ?? 'all',
          data: await getHottestPlayers(options),
        })
      case 'rising':
        return NextResponse.json({
          list: 'rising',
          sport: sport ?? 'all',
          data: await getRisingPlayers(options),
        })
      case 'fallers':
        return NextResponse.json({
          list: 'fallers',
          sport: sport ?? 'all',
          data: await getFallers(options),
        })
      case 'trade_targets':
        return NextResponse.json({
          list: 'trade_targets',
          sport: sport ?? 'all',
          data: await getTopTradeInterest(options),
        })
      case 'draft_targets':
        return NextResponse.json({
          list: 'draft_targets',
          sport: sport ?? 'all',
          data: await getTopDraftFrequency(options),
        })
      default:
        return NextResponse.json(
          { error: 'Invalid list', allowed: ['hottest', 'rising', 'fallers', 'trade_targets', 'draft_targets'] },
          { status: 400 }
        )
    }
  } catch (e) {
    console.error('Player trend API error:', e)
    return NextResponse.json({ error: 'Failed to fetch trend data' }, { status: 500 })
  }
}

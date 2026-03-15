/**
 * PlayerTrendPanelResolver – resolves data and props for PlayerTrendPanel.
 * Trend score, add/drop, direction, sport context, AI summary entry point.
 */

import { getHottestPlayers, getRisingPlayers, getFallers } from '@/lib/player-trend'
import { resolveSportForMetaUI } from './SportMetaUIResolver'

export type TrendListType = 'hottest' | 'rising' | 'fallers'

export interface PlayerTrendPanelPayload {
  list: TrendListType
  sport: string
  limit: number
  data: Array<{
    playerId: string
    sport: string
    trendScore: number
    trendingDirection: string
    addRate: number
    dropRate: number
    tradeInterest: number
    draftFrequency: number
    lineupStartRate: number
    injuryImpact: number
    updatedAt: string
  }>
}

export async function resolvePlayerTrendPanel(opts: {
  sport: string
  list: TrendListType
  limit?: number
}): Promise<PlayerTrendPanelPayload> {
  const sport = resolveSportForMetaUI(opts.sport)
  const limit = opts.limit ?? 10
  const fetcher =
    opts.list === 'hottest'
      ? getHottestPlayers
      : opts.list === 'rising'
        ? getRisingPlayers
        : getFallers
  const rows = await fetcher({ sport, limit })
  return {
    list: opts.list,
    sport,
    limit,
    data: rows.map((r) => ({
      ...r,
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
    })),
  }
}

/**
 * WarRoomMetaWidgetResolver – resolves data for WarRoomMetaWidget.
 * Live meta during drafts: position trend shifts, strategy warnings/opportunities, sport-aware recommendations.
 */

import { getHottestPlayers } from '@/lib/player-trend'
import { getStrategyMetaReports } from '@/lib/strategy-meta'
import { resolveSportForMetaUI } from './SportMetaUIResolver'

export interface WarRoomMetaWidgetPayload {
  sport: string
  trending: Array<{ playerId: string; trendScore: number; trendingDirection: string }>
  strategies: Array<{ strategyType: string; usageRate: number; successRate: number }>
}

export async function resolveWarRoomMetaWidget(sport: string, limit = 5): Promise<WarRoomMetaWidgetPayload> {
  const normalizedSport = resolveSportForMetaUI(sport)
  const [trendingRows, strategyRows] = await Promise.all([
    getHottestPlayers({ sport: normalizedSport, limit }),
    getStrategyMetaReports({ sport: normalizedSport }),
  ])
  return {
    sport: normalizedSport,
    trending: trendingRows.slice(0, limit).map((p) => ({
      playerId: p.playerId,
      trendScore: p.trendScore,
      trendingDirection: p.trendingDirection,
    })),
    strategies: strategyRows.slice(0, limit).map((s) => ({
      strategyType: s.strategyType,
      usageRate: s.usageRate,
      successRate: s.successRate,
    })),
  }
}

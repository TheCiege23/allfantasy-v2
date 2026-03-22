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
  strategies: Array<{ strategyType: string; strategyLabel?: string; usageRate: number; successRate: number; trendingDirection: string }>
}

export async function resolveWarRoomMetaWidget(
  sport: string,
  limit = 5,
  timeframe?: '24h' | '7d' | '30d'
): Promise<WarRoomMetaWidgetPayload> {
  const normalizedSport = resolveSportForMetaUI(sport)
  const [trendingRows, strategyRows] = await Promise.all([
    getHottestPlayers({ sport: normalizedSport, limit, timeframe }),
    getStrategyMetaReports({ sport: normalizedSport, timeframe }),
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
      strategyLabel: s.strategyLabel,
      usageRate: s.usageRate,
      successRate: s.successRate,
      trendingDirection: s.trendingDirection,
    })),
  }
}

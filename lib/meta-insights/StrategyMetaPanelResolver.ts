/**
 * StrategyMetaPanelResolver – resolves data for StrategyMetaPanel.
 * Most popular strategies, success rates, strategy trend, sport-specific context.
 */

import { getStrategyMetaReports } from '@/lib/strategy-meta'
import { resolveSportForMetaUI } from './SportMetaUIResolver'

export interface StrategyMetaPanelPayload {
  sport: string
  leagueFormat?: string
  data: Array<{
    strategyType: string
    sport: string
    usageRate: number
    successRate: number
    trendingDirection: string
    leagueFormat: string
    sampleSize: number
  }>
}

export async function resolveStrategyMetaPanel(opts: {
  sport: string
  leagueFormat?: string
}): Promise<StrategyMetaPanelPayload> {
  const sport = resolveSportForMetaUI(opts.sport)
  const rows = await getStrategyMetaReports({
    sport,
    leagueFormat: opts.leagueFormat,
  })
  return {
    sport,
    leagueFormat: opts.leagueFormat,
    data: rows.map((r) => ({
      strategyType: r.strategyType,
      sport: r.sport,
      usageRate: r.usageRate,
      successRate: r.successRate,
      trendingDirection: r.trendingDirection,
      leagueFormat: r.leagueFormat,
      sampleSize: r.sampleSize,
    })),
  }
}

/**
 * MetaAggregationPipeline – builds weekly meta reports, platform-wide rollups, AI-consumable summaries.
 */
import { getGlobalMetaSnapshots, getPlayerMetaTrendsForMeta, getPositionMetaTrends, getStrategyMetaForEngine } from './MetaQueryService'
import { normalizeSportForMeta } from './SportMetaResolver'
import type { WeeklyMetaReport, MetaType } from './types'
import { META_TYPES } from './types'

export interface WeeklyReportOptions {
  sport: string
  season: string
  weekOrPeriod?: number
}

export async function buildWeeklyMetaReport(options: WeeklyReportOptions): Promise<WeeklyMetaReport> {
  const sport = normalizeSportForMeta(options.sport)
  const season = String(options.season)
  const weekOrPeriod = options.weekOrPeriod ?? 0

  const [playerTrending, positionTrends, strategySummary, snapshots] = await Promise.all([
    getPlayerMetaTrendsForMeta({ sport, limit: 50 }),
    getPositionMetaTrends(sport),
    getStrategyMetaForEngine(sport),
    getGlobalMetaSnapshots({ sport, season, weekOrPeriod, limit: 20 }),
  ])

  const metaTypeSummaries: Record<MetaType, Record<string, unknown>> = {} as Record<MetaType, Record<string, unknown>>
  for (const t of META_TYPES) {
    const latest = snapshots.find((s) => s.metaType === t)
    metaTypeSummaries[t] = (latest?.data as Record<string, unknown>) ?? {}
  }

  return {
    sport,
    season,
    weekOrPeriod,
    generatedAt: new Date().toISOString(),
    playerTrending: playerTrending.slice(0, 30).map((p) => ({
      playerId: p.playerId,
      trendScore: p.trendScore,
      direction: p.trendingDirection,
    })),
    positionTrends: positionTrends.map((p) => ({
      position: p.position,
      sport: p.sport,
      usageRate: p.usageRate,
      draftRate: p.draftRate,
      rosterRate: p.rosterRate,
      trendingDirection: p.trendingDirection,
    })),
    strategySummary: strategySummary.map((s) => ({
      strategyType: s.strategyType,
      sport: s.sport,
      usageRate: s.usageRate,
      successRate: s.successRate,
      trendingDirection: s.trendingDirection,
      createdAt: s.createdAt,
    })),
    metaTypeSummaries,
  }
}

export async function buildAIMetaSummary(sport?: string, metaType?: MetaType, timeframe?: string): Promise<{ summary: string; topTrends: string[]; sportContext: string }> {
  const sportNorm = sport ? normalizeSportForMeta(sport) : undefined
  const players = await getPlayerMetaTrendsForMeta({ sport: sportNorm, limit: 10 })
  const strategies = await getStrategyMetaForEngine(sportNorm)
  const sportContext = sportNorm ? `Sport: ${sportNorm}` : 'All sports'
  const topTrends = [
    ...players.slice(0, 5).map((p) => `${p.playerId} (${p.trendingDirection}, score ${Math.round(p.trendScore)})`),
    ...strategies.slice(0, 3).map((s) => `${s.strategyType}: ${Math.round(s.usageRate * 100)}% usage`),
  ]
  const summary = `Meta summary for ${sportContext}. Top trending players and strategy usage. Timeframe: ${timeframe ?? 'latest'}.`
  return { summary, topTrends, sportContext }
}

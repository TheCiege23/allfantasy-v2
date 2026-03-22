/**
 * GlobalMetaEngine – facade for platform-wide meta analytics.
 * Coordinates snapshot generation, trend detection, queries, aggregation, and sport resolution.
 */
import { generateGlobalMetaSnapshots, generateAllSportSnapshots } from './MetaSnapshotGenerator'
import { buildWeeklyMetaReport, buildAIMetaSummary } from './MetaAggregationPipeline'
import {
  getGlobalMetaSnapshots,
  getPlayerMetaTrendsForMeta,
  getPositionMetaTrends,
  getStrategyMetaForEngine,
  getLatestSnapshotPerMetaType,
} from './MetaQueryService'
import { normalizeSportForMeta, SUPPORTED_META_SPORTS } from './SportMetaResolver'
import type { MetaType, GlobalMetaSport, TimeframeId } from './types'

export { SUPPORTED_META_SPORTS, normalizeSportForMeta }

export const GlobalMetaEngine = {
  /** Generate snapshots for one sport/season (and optional week). */
  async generateSnapshots(input: { sport: string; season: string; weekOrPeriod?: number; metaTypes?: MetaType[]; timeframe?: TimeframeId }) {
    return generateGlobalMetaSnapshots(input)
  },

  /** Generate snapshots for all sports and given season. */
  async generateAllSnapshots(season?: string) {
    return generateAllSportSnapshots(season)
  },

  /** Weekly meta report for a sport/season/week. */
  async getWeeklyReport(sport: string, season: string, weekOrPeriod?: number, timeframe?: TimeframeId) {
    return buildWeeklyMetaReport({ sport, season, weekOrPeriod, timeframe })
  },

  /** AI-consumable meta summary. */
  async getAIMetaSummary(sport?: string, metaType?: MetaType, timeframe?: TimeframeId) {
    return buildAIMetaSummary(sport, metaType, timeframe)
  },

  /** Query global meta snapshots. */
  getSnapshots(opts: { sport?: string; season?: string; weekOrPeriod?: number; metaType?: MetaType; timeframe?: TimeframeId; limit?: number }) {
    return getGlobalMetaSnapshots(opts)
  },

  /** Query player meta trends. */
  getPlayerTrends(opts: { sport?: string; direction?: string; timeframe?: TimeframeId; limit?: number }) {
    return getPlayerMetaTrendsForMeta(opts)
  },

  /** Query position meta trends. */
  getPositionTrends(sport?: string, timeframe?: TimeframeId) {
    return getPositionMetaTrends(sport, timeframe)
  },

  /** Query strategy meta. */
  getStrategyMeta(sport?: string, leagueFormat?: string, timeframe?: TimeframeId) {
    return getStrategyMetaForEngine(sport, leagueFormat, timeframe)
  },

  /** Latest snapshot per meta type for a sport/season. */
  getLatestByMetaType(sport: GlobalMetaSport, season: string) {
    return getLatestSnapshotPerMetaType(sport, season)
  },
}

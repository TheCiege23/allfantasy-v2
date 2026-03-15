/**
 * Fantasy Data Warehouse — central export.
 * Layers: Raw (ingested APIs) → Normalized (StatNormalizationService) → Analytics (AnalyticsFactMaterializer).
 */

export * from './types'
export { normalizeStatPayload, fantasyPointsFromNormalized, type NormalizedStatMap } from './StatNormalizationService'
export { WarehouseIngestionService } from './WarehouseIngestionService'
export {
  generateGameFactsFromExistingStats,
  generateMatchupFactsFromLeague,
  generateStandingFactsFromLeague,
  generateRosterSnapshotsFromLeague,
  generateDraftFactsFromMockDraft,
  generateTransactionFactsFromLeague,
} from './HistoricalFactGenerator'
export {
  getLeagueHistorySummary,
  getMatchupHistory,
  getStandingsHistory,
  getRosterSnapshotsForTeam,
  getPlayerGameFactsForPlayer,
  getDraftHistoryForLeague,
  getTransactionHistoryForLeague,
  type LeagueHistorySummary,
} from './LeagueHistoryAggregator'
export {
  warehouseQuery,
  getPlayerFantasyPointsByPeriod,
  getTeamPointsByPeriodForLeague,
  getStandingsBySeasonForLeague,
  getTransactionVolumeByLeague,
  getLeagueWarehouseSummaryForAI,
  type LeagueHistorySummary as WarehouseLeagueHistorySummary,
} from './WarehouseQueryService'
export {
  getWarehouseSports,
  resolveSportForWarehouse,
  isSportSupported,
  mapToWarehouseSport,
} from './SportWarehouseResolver'
export {
  materializePlayerSeasonTrends,
  materializeLeagueSummaries,
  type MaterializedPlayerTrend,
  type MaterializedLeagueSummary,
} from './AnalyticsFactMaterializer'
export {
  runGameStatsIngestionPipeline,
  runMatchupScoringPipeline,
  runRosterSnapshotPipeline,
  runStandingsIngestionPipeline,
  runTransactionIngestionPipeline,
  type GameStatsPipelineResult,
  type MatchupScoringPipelineResult,
  type RosterSnapshotPipelineResult,
  type StandingsPipelineResult,
  type TransactionPipelineResult,
} from './pipelines'
export {
  runWarehouseBackfill,
  type BackfillOptions,
  type BackfillResult,
  type BackfillPipeline,
} from './backfill'

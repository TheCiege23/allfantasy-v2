/**
 * AI Simulation Integration — central export. Simulation + warehouse context for AI.
 */

export * from './types'
export { normalizeSportForAI, getSportContextLabel, AI_SPORT_CODES } from './SportAIContextResolver'
export {
  getSimulationAndWarehouseContextForLeague,
  getSimulationAndWarehouseContextForUser,
  getLeagueSport,
} from './AISimulationQueryService'
export {
  formatWinProbability,
  formatPlayoffOdds,
  formatRosterStrength,
  formatTradeChampionshipImpact,
  formatWaiverImpact,
  formatDraftInsight,
} from './AIProjectionInterpreter'
export { getMatchupPredictionSummary, formatMatchupPredictionForAI } from './MatchupPredictionService'
export { getDynastyAdviceSummaryForLeague, getDynastyAdviceForTeam } from './DynastyAdviceService'
export { getTeamOutlookSummary } from './AITeamOutlookService'
export { getInsightContext } from './AIInsightRouter'

/**
 * Matchup Simulator UX — view service, comparison, result renderer, position resolver, AI bridge, sport UI.
 */

export {
  getViewState,
  getDisplayPayload,
  type ViewState,
  type MatchupDisplayPayload,
} from './MatchupSimulatorViewService'

export {
  resolveComparisonSummary,
  type ComparisonSummary,
} from './TeamComparisonResolver'

export {
  resultToDisplayProps,
  type SimulationDisplayProps,
} from './SimulationResultRenderer'

export {
  getPositionSlotsForSport,
  type PositionSlot,
} from './PositionComparisonResolver'

export {
  getMatchupAIChatUrl,
  buildMatchupSummaryForAI,
  type MatchupContextForAI,
} from './SimulatorToAIContextBridge'

export {
  getSportOptionsForSimulation,
  getSportLabel,
  getDefaultStdDevForSport,
  getVolatilityLabel,
  type SportOption,
} from './SportSimulationUIResolver'

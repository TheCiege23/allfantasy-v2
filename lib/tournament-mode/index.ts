/**
 * Tournament Mode — multi-league elimination factory.
 */

export * from './types'
export {
  DEFAULT_TOURNAMENT_SETTINGS,
  TOURNAMENT_LEAGUE_VARIANT,
  BLACK_THEME,
  GOLD_THEME,
  BLACK_VS_GOLD_CONFERENCE_NAMES,
  FEEDER_LEAGUE_NAMES,
  LATER_ROUND_NAMES,
  THEMED_CONFERENCE_PAIRS,
} from './constants'
export * from './advancement-rules'
export * from './LeagueNamingService'
export * from './TournamentConfigService'
export * from './TournamentCreationService'
export * from './TournamentStandingsService'
export { condenseRound, recordBracketProgression } from './TournamentAdvancementService'
export * from './TournamentProgressionService'
export * from './TournamentRedraftService'
export * from './TournamentEliminationEngine'
export * from './TournamentExportService'
export * from './TournamentAuditService'
export * from './safety'

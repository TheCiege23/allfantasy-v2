/**
 * Devy Dynasty specialty league. PROMPT 2/6.
 * Sport adapters: nfl_devy (NCAA Football), nba_devy (NCAA Basketball).
 */

export {
  isDevyLeague,
  getDevyConfig,
  upsertDevyConfig,
} from './DevyLeagueConfig'
export {
  getDevyAdapterForSport,
  DEVY_DYNASTY_VARIANT,
  type DevyLeagueConfigShape,
  type DevySportAdapterId,
  type DevyFormatCapabilities,
  type DevyCommissionerSettings,
  type DevyDraftPhase,
  type DevyPickOrderMethod,
  type DevyEligibilityResult,
  type DevyEligibilityAdapter,
} from './types'
export * from './constants'
export * from './eligibility'
export {
  validateDevyRosterSlots,
  isEligibleToScore,
  getDevySlotCount,
  getTaxiSize,
  type RosterSlotConstraint,
  type LineupLegalityResult,
} from './roster/DevyRosterRules'
export {
  getCurrentDraftPhase,
  getPhaseConfig,
  getPoolExclusionRule,
  type DevyDraftPhaseInfo,
  type DraftPhaseStatus,
} from './draft/DevyDraftOrchestration'
export {
  checkPromotionLimit,
  markDevyPlayerGraduated,
  type PromotionCheckResult,
} from './graduation/DevyGraduationService'

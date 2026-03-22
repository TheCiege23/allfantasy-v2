/**
 * Devy Dynasty specialty league. PROMPT 2/6 + 3/6.
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
  DEVY_LIFECYCLE_STATE,
  DEVY_ASSET_TYPE,
  type DevyLeagueConfigShape,
  type DevySportAdapterId,
  type DevyFormatCapabilities,
  type DevyCommissionerSettings,
  type DevyDraftPhase,
  type DevyPickOrderMethod,
  type DevyEligibilityResult,
  type DevyEligibilityAdapter,
  type DevyLifecycleState,
  type PromotionTiming,
  type DevyAssetType,
} from './types'
export * from './constants'
export * from './eligibility'
export {
  validateDevyRosterSlots,
  isEligibleToScore,
  getDevySlotCount,
  getTaxiSize,
  validateTaxiEligibility,
  validateFullLineupLegality,
  getSlotMaxCounts,
  type RosterSlotConstraint,
  type LineupLegalityResult,
  type TaxiEligibilityResult,
  type LineupSlotFill,
} from './roster/DevyRosterRules'
export {
  getDevyRosterDefaults,
  getStartupVetRounds,
  getTotalRosterSize,
  getSlotCountsByCategory,
  type DevyRosterSlot,
  type DevyRosterTemplate,
} from './roster/DevyRosterDefaults'
export {
  getCurrentDraftPhase,
  getCompletedPhases,
  getPhaseConfig,
  getPoolExclusionRule,
  type DevyDraftPhaseInfo,
  type DraftPhaseStatus,
} from './draft/DevyDraftOrchestration'
export {
  getFutureDevyPicks,
  getFutureRookiePicks,
  resolveDevyPickOwner,
  getPickInventoryForRoster,
  validatePickTradeRules,
  validatePickYearsOut,
  type DevyPickType,
  type TradedPickRecord,
  type PickInventory,
  type PickTradeValidationResult,
} from './draft/DevyPickOwnership'
export {
  checkPromotionLimit,
  markDevyPlayerGraduated,
  type PromotionCheckResult,
} from './graduation/DevyGraduationService'
export {
  appendDevyLifecycleEvent,
  getDevyLifecycleEvents,
  type DevyLifecycleEventType,
  type AppendDevyEventInput,
} from './lifecycle/DevyAuditLog'
export {
  canTransition,
  transitionDevyRights,
  markDeclaredAndDrafted,
  returnToSchool,
  restoreNcaaState,
  type TransitionDevyRightsInput,
} from './lifecycle/DevyLifecycleEngine'
export {
  syncDeclaredStatus,
  syncDraftedStatus,
  runAutoPromotionByTiming,
  runRightsExpiration,
  getPromotionWindowStatus,
  getRosterLegalityBlockers,
  runLifecycleAutomationSync,
  type PromotionWindowStatus,
  type RosterLegalityBlocker,
  type AutomationSyncResult,
} from './lifecycle/DevyLifecycleAutomation'
export {
  getDevyHeldPromotedDevyPlayerIds,
  getPromotedProPlayerIdsExcludedFromRookiePool,
  isExcludedFromRookiePoolAsDevyHeld,
  isProPlayerExcludedFromRookiePool,
  validatePoolSeparation,
  leagueUsesPoolSeparation,
  type PoolType,
} from './pool/DevyPoolSeparation'
export {
  buildDevyPool,
  buildRookiePoolExclusionSet,
  isInRookiePool,
  isDevyPlayerInRookiePool,
  getVetPoolExclusionRule,
  assertNoPoolOverlap,
  type DevyPoolPlayer,
  type RookiePoolPlayer,
  type VetPoolPlayer,
  type PoolBuildResult,
} from './pool/DevyPoolManager'
export {
  checkPromotionEligibility,
  executePromotion,
  forcePromote,
  revokePromotion,
  type PromotionEligibilityResult,
} from './promotion/DevyPromotionService'
export {
  fuzzyMatchScore,
  findBestProMatchForDevy,
  createCommissionerOverride,
  resolveCommissionerOverride,
  listPendingOverrides,
} from './disambiguation/DevyMappingResolver'
export { validateDevyWaiverClaim } from './waiver/DevyWaiverRules'
export {
  optimizeNflBestBallLineup,
  optimizeNbaBestBallLineup,
  DEFAULT_NFL_BESTBALL_SLOTS,
  DEFAULT_NBA_BESTBALL_SLOTS,
  type BestBallPlayerInput,
  type DevyBestBallSlotsNFL,
  type DevyBestBallSlotsNBA,
  type IdpBestBallSlots,
} from './bestball/DevyBestBallOptimizer'
export {
  getDevyScoringPresets,
  getDevyScoringPresetById,
  type DevyScoringPreset,
} from './scoring/DevyScoringPresets'
export {
  getDevyTeamOutlook,
  computeFutureCapitalScore,
  computeDevyInventoryScore,
  computeClassDepthByYear,
  type DevyTeamOutlook,
} from './rankings/DevyTeamOutlookService'
export { processDevyJob, type DevyJobResult } from './jobs/DevyJobsHandler'

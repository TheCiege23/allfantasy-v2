/**
 * Merged Devy / C2C (College to Canton) specialty league. PROMPT 2/6.
 * Sport adapters: nfl_c2c, nba_c2c.
 */

export { isC2CLeague, getC2CConfig, upsertC2CConfig } from './C2CLeagueConfig'
export {
  MERGED_DEVY_C2C_VARIANT,
  getC2CAdapterForSport,
  type C2CSportAdapterId,
  type C2CLeagueConfigShape,
  type C2CFormatCapabilities,
  type C2CCommissionerSettings,
  type C2CLineupSlots,
  type C2CEligibilityResult,
  type C2CRosterLegalityResult,
  type C2CPoolType,
  type C2CDraftPhase,
  type StartupFormat,
  type StandingsModel,
} from './types'
export * from './constants'
export { checkCollegeEligibility, checkProEligibility, getC2CCollegePositions } from './eligibility/C2CEligibilityService'
export {
  isEligibleForCollegeScoring,
  isEligibleForProScoring,
  validateC2CRosterSlots,
  getCollegeRosterSize,
  getTaxiSize,
  getProBenchSize,
  getProIRSize,
} from './roster/C2CRosterRules'
export {
  getC2CDevyHeldPromotedDevyPlayerIds,
  getC2CPromotedProPlayerIdsExcludedFromRookiePool,
  isProPlayerExcludedFromC2CRookiePool,
  validateC2CPoolSeparation,
  leagueUsesC2CPoolSeparation,
} from './pool/C2CPoolSeparation'
export {
  getCurrentC2CDraftPhase,
  getPoolTypeForC2CPhase,
  getC2CPhaseConfig,
  type C2CDraftPhaseInfo,
  type C2CDraftPhaseStatus,
} from './draft/C2CDraftOrchestration'
export {
  optimizeC2CProBestBall,
  optimizeC2CCollegeBestBall,
  optimizeC2CBestBall,
  type C2CBestBallResult,
} from './bestball/C2CBestBallOptimizer'
export {
  appendC2CLifecycleEvent,
  getC2CLifecycleEvents,
  type C2CLifecycleEventType,
  type AppendC2CEventInput,
} from './lifecycle/C2CAuditLog'
export {
  canTransitionC2C,
  transitionC2CRights,
  markC2CDeclaredAndDrafted,
  c2CReturnToSchool,
  c2CRestoreCollegeState,
  C2C_COLLEGE_ACTIVE_STATES,
  type TransitionC2CRightsInput,
} from './lifecycle/C2CLifecycleEngine'
export {
  checkC2CPromotionEligibility,
  executeC2CPromotion,
  c2CForcePromote,
  c2CRevokePromotion,
  type C2CPromotionEligibilityResult,
} from './promotion/C2CPromotionService'
export {
  getC2CStandings,
  getC2CUnifiedStandings,
  getC2CSeparateStandings,
  getC2CHybridStandings,
  computeHybridScore,
  type C2CStandingsRow,
  type C2CStandingsResult,
} from './standings/C2CStandingsService'
export { C2C_LIFECYCLE_STATE, type C2CLifecycleState, type C2CPromotionTiming, type C2CHybridStandingsConfig } from './types'
export { getC2CScoringPresets, getC2CScoringPresetById, type C2CScoringPreset } from './scoring/C2CScoringPresets'
export { runC2CBestBallSnapshot, getC2CBestBallPointsForPeriod, type C2CBestBallSnapshotInput } from './bestball/C2CBestBallSnapshotService'
export {
  C2C_TRADE_ASSET_TYPE,
  resolveC2CAssetType,
  c2CValuationModifier,
  type C2CTradeAssetType,
  type C2CTradeValuationContext,
} from './trade/C2CTradeAssetTypes'
export {
  buildC2CPipelineAdvisorContext,
  buildC2CCollegeVsRookieContext,
  buildC2CStartupDraftAssistantContext,
  buildC2CPromotionAdvisorContext,
  buildC2CHybridStrategyContext,
  buildC2CTradeContextFromPayload,
  type C2CAIContext,
  type C2CPipelineAdvisorContext,
  type C2CPromotionAdvisorContext,
  type C2CTradeContext,
} from './ai/C2CAIContext'
export { buildC2CAIPrompt } from './ai/C2CAIPrompts'
export { buildC2CContextForChimmy } from './ai/c2cContextForChimmy'

/**
 * IDP League — Individual Defensive Player. NFL only.
 * PROMPT 2/6: League factory + settings + rosters + scoring presets.
 */

export * from './types'
export {
  isIdpLeague,
  getIdpLeagueConfig,
  upsertIdpLeagueConfig,
  getRosterDefaultsForIdpLeague,
} from './IDPLeagueConfig'
export {
  buildIdpStarterSlots,
  getRosterDefaultsForIdpPreset,
  getFullRosterDefaultsForIdp,
} from './IDPRosterPresets'
export {
  isIdpPosition,
  isOffensivePosition,
  getAllowedPositionsForIdpSlot,
  isPositionEligibleForIdpSlot,
  validateIdpLineupSlot,
} from './IDPEligibility'
export {
  IDP_STAT_KEYS,
  IDP_OPTIONAL_STAT_KEYS,
  IDP_SCORING_PRESET_LABELS,
  IDP_POSITION_MODE_LABELS,
  IDP_ROSTER_PRESET_LABELS,
  IDP_DRAFT_TYPE_LABELS,
  getIdpPresetScoring,
} from './IDPScoringPresets'
export { buildIdpContextForChimmy } from './ai/idpContextForChimmy'
export { writeIdpSettingsAudit, getIdpSettingsAuditLog } from './IdpSettingsAudit'
export {
  validateRosterSetup,
  validateScoringOutliers,
  countIdpStarterSlots,
  canChangePositionModeOrStarters,
  previewRosterImpact,
  mergeScoringForValidation,
} from './IdpValidationService'
export {
  dedupePositionTags,
  resolveEligibility,
  isEligibleForSlot,
  upsertEligibility,
  recordEligibilityChangeAudit,
  IDP_GLOBAL_LEAGUE_SENTINEL,
} from './IdpEligibilityService'
export {
  upsertIdpBestBallSnapshot,
  getIdpBestBallSnapshots,
  regenerateIdpBestBallSnapshots,
} from './IdpBestBallSnapshotService'
export {
  getAllowedIdpSlotNamesForLeague,
  checkIdpLineupGaps,
  canRosterFieldLegalIdpLineup,
} from './IdpEdgeCaseHandlers'
export {
  mergeIdpScoringRules,
  getMergedScoringRulesForLeague,
  computeIdpFantasyPoints,
  type IdpFantasyPointsResult,
} from './scoringEngine'
export {
  normalizeExternalDefenseStats,
  generateDeterministicWeeklyStatLine,
  type IdpWeeklyStatLine,
} from './statIngestionEngine'

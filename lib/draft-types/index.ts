/**
 * Canonical draft type contract — re-exports for shared imports.
 */

export {
  DRAFT_TYPES_BY_LEAGUE_FORMAT,
  DRAFT_TYPE_DEFINITIONS,
  DRAFT_TYPE_LABELS,
  EXECUTION_MODE_DRAFT_IDS,
  PLATFORM_SPORT_RULES_DRAFT_TYPES,
  POST_CREATE_LIFECYCLE_DRAFT_IDS,
  THIRD_ROUND_REVERSAL_MODIFIER,
  getDraftTypeDefinition,
  getDraftTypeUiHint,
  getDraftTypeUiLabel,
  getDraftTypesForConceptAndSport,
  isDraftTypeAllowedForConceptAndSport,
  isExecutionModeDraftType,
  listAllFormatDraftTypeIds,
  listCreateLeagueWireDraftTypeIds,
  mapCanonicalDraftTypeToEngineCore,
  mapDraftTypeToSportRulesBase,
  normalizeDraftTypeForEngineValidation,
  resolveEffectiveDraftTypeForConcept,
} from './draftTypeRegistry'

export type {
  DraftLifecycleScope,
  DraftMatrixLeagueFormatId,
  DraftTypeCategory,
  DraftTypeDefinition,
  EngineCoreDraftType,
  ExecutionModeDraftId,
  PlatformSportRulesDraftTypeId,
} from './draftTypeRegistry'

/**
 * Feature toggles and platform config.
 */

export {
  getValue,
  setValue,
  getBoolean,
  setBoolean,
  getStringArray,
  setStringArray,
  getFeatureTogglesSnapshot,
  getBooleanToggleKeys,
  FEATURE_KEYS,
} from "./FeatureToggleService"
export type { FeatureTogglesSnapshot } from "./FeatureToggleService"

export {
  invalidateConfigCache,
  isAIAssistantEnabled,
  isMockDraftsEnabled,
  isLegacyModeEnabled,
  areBracketChallengesEnabled,
  getEnabledSports,
  isSportEnabled,
  isFeatureEnabled,
  isToolWaiverAIEnabled,
  isToolTradeAnalyzerEnabled,
  isToolRankingsEnabled,
  isExperimentalLegacyImportEnabled,
  isExperimentalDynastyEnabled,
  getPlatformConfigSnapshot,
} from "./PlatformConfigResolver"

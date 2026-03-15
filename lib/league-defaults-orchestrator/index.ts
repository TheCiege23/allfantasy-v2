/**
 * Unified league defaults orchestrator — single entry for league creation preset resolution and initialization.
 */
export {
  getCreationPayload,
  getInitialSettingsForCreation,
  getCreationPayloadAndSettings,
  runPostCreateInitialization,
  resolveSportVariantContext,
  buildSettingsPreview,
  getSettingsPreviewSummary,
  runLeagueInitialization,
} from './LeagueDefaultsOrchestrator'
export type { LeagueCreationDefaultsPayload, BootstrapResult, CreationOverrides } from './LeagueDefaultsOrchestrator'
export { resolveLeaguePresetPipeline } from './LeaguePresetResolutionPipeline'
export type { LeaguePresetResolutionResult } from './LeaguePresetResolutionPipeline'
export type { SportVariantContext } from './SportVariantContextResolver'
export { SUPPORTED_SPORTS } from './SportVariantContextResolver'

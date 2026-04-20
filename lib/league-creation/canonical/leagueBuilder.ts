/**
 * Preset + persistence helpers for canonical Create League (server-friendly barrel).
 */

export { runPresetEngine, PRESET_ENGINE_VERSION } from '@/lib/league-creation/preset-engine/runPresetEngine'
export { createCanonicalLeagueInTransaction } from '@/lib/league-creation/canonical/createCanonicalLeagueInTransaction'
export {
  validateCreatePayload,
  stripForbiddenCreateLeagueFields,
  normalizeDraftTypeForEngine,
  createLeagueBodySchema,
} from '@/lib/league-creation/canonical/validateCreateLeague'
export type { PresetEngineOutput, DerivedLeagueFlags } from '@/lib/league-creation/canonical/types'

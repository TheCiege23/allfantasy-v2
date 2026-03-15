/**
 * Resolves the draft preset (defaults) for a given sport and league variant.
 * Used by league creation, draft room config, and AI draft context.
 */
import { getDraftPreset } from './DraftDefaultsRegistry'
import type { DraftDefaults } from '@/lib/sport-defaults/types'

export interface DraftPresetResult {
  preset: DraftDefaults
  sport: string
  variant: string | null
}

/**
 * Resolve draft preset by sport and optional variant.
 * NFL IDP / DYNASTY_IDP get IDP-specific rounds and queue limits.
 */
export function resolveDraftPreset(
  sport: string,
  variant?: string | null
): DraftPresetResult {
  const preset = getDraftPreset(sport, variant ?? undefined)
  return {
    preset,
    sport,
    variant: variant ?? null,
  }
}

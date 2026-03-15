/**
 * Resolves the playoff preset (defaults) for a given sport and league variant.
 * Used by league creation, bracket config, and seeding.
 */
import { getPlayoffPreset } from './PlayoffDefaultsRegistry'
import type { DefaultPlayoffConfig } from '@/lib/sport-defaults/types'

export interface PlayoffPresetResult {
  preset: DefaultPlayoffConfig
  sport: string
  variant: string | null
}

/**
 * Resolve playoff preset by sport and optional variant.
 */
export function resolvePlayoffPreset(
  sport: string,
  variant?: string | null
): PlayoffPresetResult {
  const preset = getPlayoffPreset(sport, variant ?? undefined)
  return {
    preset,
    sport,
    variant: variant ?? null,
  }
}

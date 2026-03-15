/**
 * Resolves the waiver preset (defaults) for a given sport and league variant.
 * Used by league creation, waiver UI, and processing config.
 */
import { getWaiverPreset } from './WaiverDefaultsRegistry'
import type { WaiverDefaults } from '@/lib/sport-defaults/types'

export interface WaiverPresetResult {
  preset: WaiverDefaults
  sport: string
  variant: string | null
}

/**
 * Resolve waiver preset by sport and optional variant.
 */
export function resolveWaiverPreset(
  sport: string,
  variant?: string | null
): WaiverPresetResult {
  const preset = getWaiverPreset(sport, variant ?? undefined)
  return {
    preset,
    sport,
    variant: variant ?? null,
  }
}

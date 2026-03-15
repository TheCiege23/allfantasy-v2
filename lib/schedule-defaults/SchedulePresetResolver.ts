/**
 * Resolves the schedule preset (defaults) for a given sport and league variant.
 * Used by league creation, matchup generation, and scoring window logic.
 */
import { getSchedulePreset } from './ScheduleDefaultsRegistry'
import type { DefaultScheduleConfig } from '@/lib/sport-defaults/types'

export interface SchedulePresetResult {
  preset: DefaultScheduleConfig
  sport: string
  variant: string | null
}

/**
 * Resolve schedule preset by sport and optional variant.
 */
export function resolveSchedulePreset(
  sport: string,
  variant?: string | null
): SchedulePresetResult {
  const preset = getSchedulePreset(sport, variant ?? undefined)
  return {
    preset,
    sport,
    variant: variant ?? null,
  }
}

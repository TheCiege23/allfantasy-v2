/**
 * Schedule defaults registry — single entry for sport- and variant-aware schedule behavior.
 * Re-exports resolveDefaultScheduleConfig and provides getSchedulePreset for league creation and matchup generation.
 */
import { resolveDefaultScheduleConfig, normalizeScheduleVariant } from '@/lib/sport-defaults/DefaultScheduleConfigResolver'
import type { SportType, DefaultScheduleConfig } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

const DEFAULT_SCHEDULE_VARIANTS_BY_SPORT: Record<SportType, string[]> = {
  NFL: ['STANDARD', 'PPR', 'HALF_PPR', 'SUPERFLEX', 'IDP', 'DYNASTY_IDP', 'DEVY_DYNASTY', 'MERGED_DEVY_C2C'],
  NBA: ['STANDARD', 'DEVY_DYNASTY', 'MERGED_DEVY_C2C'],
  MLB: ['STANDARD'],
  NHL: ['STANDARD'],
  NCAAF: ['STANDARD'],
  NCAAB: ['STANDARD'],
  SOCCER: ['STANDARD', 'NO_PLAYOFF'],
}

/**
 * Get the full schedule preset for a sport and optional league variant.
 * Use for league creation, matchup cadence, and scoring windows. NFL IDP uses same as NFL.
 */
export function getSchedulePreset(sport: SportType | string, variant?: string | null): DefaultScheduleConfig {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  const normalizedVariant = normalizeScheduleVariant(variant)
  return resolveDefaultScheduleConfig(sportType, normalizedVariant)
}

/**
 * Enumerate supported schedule presets by sport for settings screens and QA.
 */
export function getSchedulePresetDefinitions(
  sport: SportType | string
): Array<{ sport: SportType; variant: string; preset: DefaultScheduleConfig }> {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  const variants = DEFAULT_SCHEDULE_VARIANTS_BY_SPORT[sportType] ?? ['STANDARD']
  return variants.map((variant) => ({
    sport: sportType,
    variant,
    preset: getSchedulePreset(sportType, variant),
  }))
}

export function getSupportedScheduleVariantsForSport(sport: SportType | string): string[] {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  return [...(DEFAULT_SCHEDULE_VARIANTS_BY_SPORT[sportType] ?? ['STANDARD'])]
}

export { resolveDefaultScheduleConfig } from '@/lib/sport-defaults/DefaultScheduleConfigResolver'
export { normalizeScheduleVariant } from '@/lib/sport-defaults/DefaultScheduleConfigResolver'
export type { DefaultScheduleConfig } from '@/lib/sport-defaults/types'

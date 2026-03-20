/**
 * Waiver defaults registry — single entry for sport- and variant-aware waiver presets.
 * Re-exports getWaiverDefaults and provides getWaiverPreset for league creation and waiver processor.
 */
import { getWaiverDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
import type { SportType, WaiverDefaults } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

const DEFAULT_WAIVER_VARIANTS_BY_SPORT: Record<SportType, string[]> = {
  NFL: ['STANDARD', 'PPR', 'HALF_PPR', 'SUPERFLEX', 'IDP', 'DYNASTY_IDP', 'devy_dynasty'],
  NBA: ['STANDARD', 'devy_dynasty'],
  MLB: ['STANDARD'],
  NHL: ['STANDARD'],
  NCAAF: ['STANDARD'],
  NCAAB: ['STANDARD'],
  SOCCER: ['STANDARD'],
}

export const SUPPORTED_WAIVER_MODES = ['standard', 'rolling', 'reverse_standings', 'faab', 'fcfs'] as const

/**
 * Get the full waiver preset for a sport and optional league variant.
 * Use for league creation payload, waiver UI, and bootstrap.
 */
export function getWaiverPreset(sport: SportType | string, variant?: string | null): WaiverDefaults {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  return getWaiverDefaults(sportType, variant ?? undefined)
}

/**
 * Enumerate supported waiver presets by sport for settings screens and QA.
 */
export function getWaiverPresetDefinitions(
  sport: SportType | string
): Array<{ sport: SportType; variant: string; preset: WaiverDefaults }> {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  const variants = DEFAULT_WAIVER_VARIANTS_BY_SPORT[sportType] ?? ['STANDARD']
  return variants.map((variant) => ({
    sport: sportType,
    variant,
    preset: getWaiverDefaults(sportType, variant),
  }))
}

export function getSupportedWaiverVariantsForSport(sport: SportType | string): string[] {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  return [...(DEFAULT_WAIVER_VARIANTS_BY_SPORT[sportType] ?? ['STANDARD'])]
}

export { getWaiverDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
export type { WaiverDefaults } from '@/lib/sport-defaults/types'

/**
 * Playoff defaults registry — single entry for sport- and variant-aware playoff presets.
 * Re-exports resolveDefaultPlayoffConfig and provides getPlayoffPreset for league creation and bracket config.
 */
import { resolveDefaultPlayoffConfig } from '@/lib/sport-defaults/DefaultPlayoffConfigResolver'
import type { SportType, DefaultPlayoffConfig } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

const DEFAULT_PLAYOFF_VARIANTS_BY_SPORT: Record<SportType, string[]> = {
  NFL: ['STANDARD', 'PPR', 'HALF_PPR', 'SUPERFLEX', 'IDP', 'DYNASTY_IDP', 'devy_dynasty'],
  NBA: ['STANDARD', 'devy_dynasty'],
  MLB: ['STANDARD'],
  NHL: ['STANDARD'],
  NCAAF: ['STANDARD'],
  NCAAB: ['STANDARD'],
  SOCCER: ['STANDARD', 'NO_PLAYOFF'],
}

/**
 * Get the full playoff preset for a sport and optional league variant.
 * Use for league creation, bracket UI, and bootstrap. NFL IDP uses same as NFL.
 */
export function getPlayoffPreset(sport: SportType | string, variant?: string | null): DefaultPlayoffConfig {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  return resolveDefaultPlayoffConfig(sportType, variant ?? undefined)
}

/**
 * Enumerate supported playoff presets by sport for settings screens and QA.
 */
export function getPlayoffPresetDefinitions(
  sport: SportType | string
): Array<{ sport: SportType; variant: string; preset: DefaultPlayoffConfig }> {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  const variants = DEFAULT_PLAYOFF_VARIANTS_BY_SPORT[sportType] ?? ['STANDARD']
  return variants.map((variant) => ({
    sport: sportType,
    variant,
    preset: getPlayoffPreset(sportType, variant),
  }))
}

export function getSupportedPlayoffVariantsForSport(sport: SportType | string): string[] {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  return [...(DEFAULT_PLAYOFF_VARIANTS_BY_SPORT[sportType] ?? ['STANDARD'])]
}

export { resolveDefaultPlayoffConfig } from '@/lib/sport-defaults/DefaultPlayoffConfigResolver'
export type { DefaultPlayoffConfig } from '@/lib/sport-defaults/types'

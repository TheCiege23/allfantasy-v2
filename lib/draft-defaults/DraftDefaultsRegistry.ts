/**
 * Draft defaults registry — single entry for sport- and variant-aware draft presets.
 * Re-exports getDraftDefaults and provides getDraftPreset for draft room and league bootstrap.
 */
import { getDraftDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
import type { SportType, DraftDefaults } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

const DEFAULT_VARIANTS_BY_SPORT: Record<SportType, string[]> = {
  NFL: ['STANDARD', 'PPR', 'HALF_PPR', 'SUPERFLEX', 'IDP', 'DYNASTY_IDP', 'devy_dynasty'],
  NBA: ['STANDARD', 'devy_dynasty'],
  MLB: ['STANDARD'],
  NHL: ['STANDARD'],
  NCAAF: ['STANDARD'],
  NCAAB: ['STANDARD'],
  SOCCER: ['STANDARD'],
}

/**
 * Get the full draft preset for a sport and optional league variant.
 * Use for league creation payload, draft room config, and bootstrap.
 */
export function getDraftPreset(sport: SportType | string, variant?: string | null): DraftDefaults {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  return getDraftDefaults(sportType, variant ?? undefined)
}

/**
 * Enumerate supported draft presets by sport for settings screens and QA.
 */
export function getDraftPresetDefinitions(
  sport: SportType | string
): Array<{ sport: SportType; variant: string; preset: DraftDefaults }> {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  const variants = DEFAULT_VARIANTS_BY_SPORT[sportType] ?? ['STANDARD']
  return variants.map((variant) => ({
    sport: sportType,
    variant,
    preset: getDraftDefaults(sportType, variant),
  }))
}

export function getSupportedDraftVariantsForSport(sport: SportType | string): string[] {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  return [...(DEFAULT_VARIANTS_BY_SPORT[sportType] ?? ['STANDARD'])]
}

export { getDraftDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
export type { DraftDefaults } from '@/lib/sport-defaults/types'

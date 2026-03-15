/**
 * Draft defaults registry — single entry for sport- and variant-aware draft presets.
 * Re-exports getDraftDefaults and provides getDraftPreset for draft room and league bootstrap.
 */
import { getDraftDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
import type { SportType, DraftDefaults } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

/**
 * Get the full draft preset for a sport and optional league variant.
 * Use for league creation payload, draft room config, and bootstrap.
 */
export function getDraftPreset(sport: SportType | string, variant?: string | null): DraftDefaults {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  return getDraftDefaults(sportType, variant ?? undefined)
}

export { getDraftDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
export type { DraftDefaults } from '@/lib/sport-defaults/types'

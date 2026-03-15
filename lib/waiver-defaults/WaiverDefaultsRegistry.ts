/**
 * Waiver defaults registry — single entry for sport- and variant-aware waiver presets.
 * Re-exports getWaiverDefaults and provides getWaiverPreset for league creation and waiver processor.
 */
import { getWaiverDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
import type { SportType, WaiverDefaults } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

/**
 * Get the full waiver preset for a sport and optional league variant.
 * Use for league creation payload, waiver UI, and bootstrap.
 */
export function getWaiverPreset(sport: SportType | string, variant?: string | null): WaiverDefaults {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  return getWaiverDefaults(sportType, variant ?? undefined)
}

export { getWaiverDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
export type { WaiverDefaults } from '@/lib/sport-defaults/types'

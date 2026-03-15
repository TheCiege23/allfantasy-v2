/**
 * Playoff defaults registry — single entry for sport- and variant-aware playoff presets.
 * Re-exports resolveDefaultPlayoffConfig and provides getPlayoffPreset for league creation and bracket config.
 */
import { resolveDefaultPlayoffConfig } from '@/lib/sport-defaults/DefaultPlayoffConfigResolver'
import type { SportType, DefaultPlayoffConfig } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

/**
 * Get the full playoff preset for a sport and optional league variant.
 * Use for league creation, bracket UI, and bootstrap. NFL IDP uses same as NFL.
 */
export function getPlayoffPreset(sport: SportType | string, variant?: string | null): DefaultPlayoffConfig {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  return resolveDefaultPlayoffConfig(sportType, variant ?? undefined)
}

export { resolveDefaultPlayoffConfig } from '@/lib/sport-defaults/DefaultPlayoffConfigResolver'
export type { DefaultPlayoffConfig } from '@/lib/sport-defaults/types'

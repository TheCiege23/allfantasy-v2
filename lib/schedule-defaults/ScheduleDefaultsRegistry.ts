/**
 * Schedule defaults registry — single entry for sport- and variant-aware schedule behavior.
 * Re-exports resolveDefaultScheduleConfig and provides getSchedulePreset for league creation and matchup generation.
 */
import { resolveDefaultScheduleConfig } from '@/lib/sport-defaults/DefaultScheduleConfigResolver'
import type { SportType, DefaultScheduleConfig } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

/**
 * Get the full schedule preset for a sport and optional league variant.
 * Use for league creation, matchup cadence, and scoring windows. NFL IDP uses same as NFL.
 */
export function getSchedulePreset(sport: SportType | string, variant?: string | null): DefaultScheduleConfig {
  const sportType = typeof sport === 'string' ? (toSportType(sport) as SportType) : sport
  return resolveDefaultScheduleConfig(sportType, variant ?? undefined)
}

export { resolveDefaultScheduleConfig } from '@/lib/sport-defaults/DefaultScheduleConfigResolver'
export type { DefaultScheduleConfig } from '@/lib/sport-defaults/types'

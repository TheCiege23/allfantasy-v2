/**
 * Combines sport defaults (registry) with league creation preset (templates from DB).
 * Single entry for "everything needed to create a league for this sport".
 */
import type { LeagueSport } from '@prisma/client'
import { resolveSportDefaults } from './SportDefaultsResolver'
import type { SportType, SportDefaultSet } from './types'
import { getLeagueCreationPreset } from '@/lib/multi-sport/MultiSportLeagueService'
import { leagueSportToSportType } from '@/lib/multi-sport/SportConfigResolver'

export interface FullLeaguePreset {
  /** From Sport Defaults Registry */
  defaults: SportDefaultSet
  /** From MultiSportLeagueService (roster + scoring templates from DB or in-memory) */
  preset: Awaited<ReturnType<typeof getLeagueCreationPreset>>
}

/**
 * Load full league preset for a sport: defaults (league/roster/scoring/draft/waiver/metadata) + roster & scoring templates.
 * When leagueVariant is provided, defaults are resolved with variant-aware overlays.
 * Use in league creation flow (backend or API).
 */
export async function getFullLeaguePreset(
  leagueSport: LeagueSport,
  leagueVariant?: string | null
): Promise<FullLeaguePreset> {
  const sportType = leagueSportToSportType(leagueSport) as SportType
  const defaults = resolveSportDefaults(sportType, leagueVariant)
  const preset = await getLeagueCreationPreset(leagueSport)
  return { defaults, preset }
}

/**
 * Load only the sport default set (no DB template fetch). Use when templates are not needed yet.
 */
export function getSportDefaultSetOnly(
  sportType: SportType | string,
  leagueVariant?: string | null
): SportDefaultSet {
  return resolveSportDefaults(sportType, leagueVariant)
}

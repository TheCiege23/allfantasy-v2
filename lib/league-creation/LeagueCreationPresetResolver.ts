/**
 * LeagueCreationPresetResolver — server-side resolver for league creation presets.
 * Loads default roster template, scoring template, draft settings, and schedule config by sport (and optional variant).
 * Used by sport-defaults API and any server code that needs creation defaults.
 */
import type { LeagueSport } from '@prisma/client'
import { loadLeagueCreationDefaults } from '@/lib/sport-defaults/LeagueCreationDefaultsLoader'
import { toSportType } from '@/lib/multi-sport/sport-types'

export type { LeagueCreationDefaultsPayload } from '@/lib/sport-defaults/LeagueCreationDefaultsLoader'

const LEAGUE_SPORTS: LeagueSport[] = ['NFL', 'NHL', 'MLB', 'NBA', 'NCAAF', 'NCAAB', 'SOCCER']

function toLeagueSport(s: string): LeagueSport {
  const t = toSportType(s)
  if (LEAGUE_SPORTS.includes(t as LeagueSport)) return t as LeagueSport
  return 'NFL'
}

/**
 * Resolve full league creation preset for a sport and optional variant (e.g. NFL + IDP).
 * Returns roster template, scoring template, draft defaults, waiver defaults, and schedule config.
 */
export async function resolveLeagueCreationPreset(
  sport: string,
  variant?: string | null
): Promise<Awaited<ReturnType<typeof loadLeagueCreationDefaults>>> {
  const leagueSport = toLeagueSport(sport)
  return loadLeagueCreationDefaults(leagueSport, variant ?? null)
}

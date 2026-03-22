/**
 * LeagueCreationPresetResolver — server-side resolver for league creation presets.
 * Loads default roster template, scoring template, draft settings, and schedule config by sport (and optional variant).
 * Used by sport-defaults API and any server code that needs creation defaults.
 */
import type { LeagueSport } from '@prisma/client'
import { loadLeagueCreationDefaults } from '@/lib/sport-defaults/LeagueCreationDefaultsLoader'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export type { LeagueCreationDefaultsPayload } from '@/lib/sport-defaults/LeagueCreationDefaultsLoader'

function toLeagueSport(s: string): LeagueSport {
  return normalizeToSupportedSport(s)
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

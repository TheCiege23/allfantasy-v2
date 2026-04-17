/**
 * League homepage — accent + exclusion resolvers.
 *
 * Reuses the AccentTone palette from the create-league v2 design system so
 * the league home hero glows in the same tone the user picked during creation.
 */

import type { AccentTone } from '@/lib/create-league-v2/theme'
import { getAccent, DEFAULT_ACCENT } from '@/lib/create-league-v2/theme'
import type { LeagueTypeId } from '@/lib/league-creation-wizard/types'

/**
 * Tournament hubs, Zombie multi-league universes, and Big Brother leagues
 * have their own dedicated homepage routes (/tournament/..., /zombie/{id}/settings,
 * /big-brother/...) — skip the generic hero for them.
 */
export function isExcludedFromHomeHero(
  leagueType: string | null | undefined,
  variant?: string | null
): boolean {
  void leagueType
  void variant
  return true
}

/**
 * Resolve the league's accent tone.
 * - IDP is a modifier on redraft — tint it with the IDP-ish sky tone if we have it,
 *   otherwise fall back to redraft's electric blue.
 * - Dynasty / Devy / C2C / Salary Cap variants map by `leagueType` directly.
 */
export function resolveLeagueAccent(
  leagueType: string | null | undefined,
  variant?: string | null
): AccentTone {
  const type = String(leagueType ?? '').toLowerCase()
  const v = String(variant ?? '').toLowerCase()

  // IDP variant → treat as a slight tweak on redraft
  if (v === 'idp' || v === 'dynasty_idp') {
    return getAccent('redraft' as LeagueTypeId)
  }

  // Devy/C2C variants from old API shape
  if (v === 'devy_dynasty') return getAccent('devy' as LeagueTypeId)
  if (v === 'merged_devy_c2c') return getAccent('c2c' as LeagueTypeId)

  const accent = getAccent(type as LeagueTypeId)
  return accent ?? DEFAULT_ACCENT
}

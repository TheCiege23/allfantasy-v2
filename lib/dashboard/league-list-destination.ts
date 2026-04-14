import type { UserLeague } from '@/app/dashboard/types'

/**
 * Canonical destination for a row in My Leagues (must match `LeagueSidebarCard` / list APIs).
 * Tournament hub rows navigate to `/tournament/[id]`; all others use `/league/[id]`.
 */
export function getLeagueListDestinationHref(league: UserLeague): string {
  const settings =
    league.settings && typeof league.settings === 'object' && !Array.isArray(league.settings)
      ? (league.settings as Record<string, unknown>)
      : {}
  const tournamentId =
    settings.league_type === 'tournament_hub' && typeof settings.tournamentId === 'string'
      ? settings.tournamentId
      : null
  if (tournamentId) return `/tournament/${tournamentId}`
  return `/league/${league.id}`
}

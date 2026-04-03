import 'server-only'

import { fetchRITeams, type RITeam } from '@/lib/players/ri-players-server'

/** In-memory team list per sport (refreshed when process restarts). */
const teamsBySport = new Map<string, RITeam[]>()

/**
 * Rolling Insights team logo URL by abbreviation (server-only — uses DataFeeds credentials).
 * For client-safe static URLs use `getTeamLogoUrl` in `teamLogos.ts`.
 */
export async function getRITeamLogoUrl(teamAbbr: string, sport: string): Promise<string | null> {
  if (!teamAbbr || teamAbbr === 'FA') return null
  const s = sport.toUpperCase()
  const abbr = teamAbbr.toUpperCase()

  let teams = teamsBySport.get(s)
  if (!teams) {
    teams = await fetchRITeams(s)
    teamsBySport.set(s, teams)
  }

  const t = teams.find((x) => x.abbr.toUpperCase() === abbr)
  return t?.logo_url || null
}

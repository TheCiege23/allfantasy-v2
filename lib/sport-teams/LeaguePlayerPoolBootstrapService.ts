/**
 * Bootstraps league-scoped player pool and team context so draft room, waiver, and roster
 * only see players and teams for the league's sport.
 * Soccer: returns SOCCER teams and player pool (sport_type = SOCCER).
 * NFL IDP: same NFL pool and teams; defensive players included when present in SportsPlayer; filter by position (DE, DT, LB, CB, S) via options in getPlayerPoolForLeague or UI.
 */
import type { LeagueSport } from '@prisma/client'
import { getPlayerPoolForLeague } from './SportPlayerPoolResolver'
import { getTeamMetadataForSportDbAware } from './SportTeamMetadataRegistry'
import type { TeamMetadata } from './types'
import { leagueSportToSportType } from '@/lib/multi-sport/SportConfigResolver'

export interface LeaguePlayerPoolContext {
  leagueId: string
  leagueSport: LeagueSport
  teams: TeamMetadata[]
  playerPoolCount: number
  samplePlayerIds: string[]
}

/**
 * Get the player pool and team metadata context for a league (sport-scoped).
 * Call when loading draft room, waiver wire, or roster to ensure sport-specific data.
 */
export async function getLeaguePlayerPoolContext(
  leagueId: string,
  leagueSport: LeagueSport,
  options?: { playerLimit?: number }
): Promise<LeaguePlayerPoolContext> {
  const sportType = leagueSportToSportType(leagueSport)
  const [players, teams] = await Promise.all([
    getPlayerPoolForLeague(leagueId, leagueSport, { limit: options?.playerLimit ?? 2000 }),
    getTeamMetadataForSportDbAware(sportType),
  ])
  const samplePlayerIds = players.slice(0, 50).map((p) => p.player_id)
  return {
    leagueId,
    leagueSport,
    teams,
    playerPoolCount: players.length,
    samplePlayerIds,
  }
}

/**
 * Ensure league context uses sport-scoped player pool. No DB writes; returns pool and teams for the league's sport.
 */
export async function bootstrapLeaguePlayerPool(
  leagueId: string,
  leagueSport: LeagueSport
): Promise<{ leagueId: string; leagueSport: LeagueSport; playerCount: number; teamCount: number }> {
  const context = await getLeaguePlayerPoolContext(leagueId, leagueSport)
  return {
    leagueId,
    leagueSport,
    playerCount: context.playerPoolCount,
    teamCount: context.teams.length,
  }
}

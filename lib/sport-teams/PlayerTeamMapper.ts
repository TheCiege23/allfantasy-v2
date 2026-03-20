/**
 * Maps players to team (team_id, team_abbreviation) by sport.
 * Used for roster cards, draft board, and waiver display.
 */
import type { LeagueSport } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { SportType } from './types'
import { getTeamIdByAbbreviationMap } from './SportTeamMetadataRegistry'

export interface PlayerTeamInfo {
  team_id: string | null
  team_abbreviation: string | null
  sport_type: string
}

/**
 * Get team info for a player by SportsPlayer or PlayerIdentityMap (sport-scoped).
 */
export async function getTeamForPlayer(
  playerIdOrSleeperId: string,
  sportType: SportType | LeagueSport | string
): Promise<PlayerTeamInfo | null> {
  const sport = typeof sportType === 'string' ? sportType.toUpperCase() : String(sportType)
  const teamIdByAbbrev = getTeamIdByAbbreviationMap(sport)

  const sp = await prisma.sportsPlayer.findFirst({
    where: {
      sport,
      OR: [{ id: playerIdOrSleeperId }, { sleeperId: playerIdOrSleeperId }, { externalId: playerIdOrSleeperId }],
    },
  })
  if (sp) {
    const abbr = sp.team?.toUpperCase() ?? null
    return {
      team_id: sp.teamId ?? (abbr ? teamIdByAbbrev.get(abbr) ?? null : null),
      team_abbreviation: sp.team ?? null,
      sport_type: sport,
    }
  }

  const identity = await prisma.playerIdentityMap.findFirst({
    where: {
      sport,
      OR: [
        { sleeperId: playerIdOrSleeperId },
        { fantasyCalcId: playerIdOrSleeperId },
        { apiSportsId: playerIdOrSleeperId },
      ],
    },
  })
  if (identity?.currentTeam) {
    const abbr = identity.currentTeam.toUpperCase()
    return {
      team_id: teamIdByAbbrev.get(abbr) ?? null,
      team_abbreviation: identity.currentTeam,
      sport_type: sport,
    }
  }
  return null
}

/**
 * Map multiple players to team info in one call (batch).
 */
export async function getTeamForPlayers(
  playerIds: string[],
  sportType: SportType | LeagueSport | string
): Promise<Map<string, PlayerTeamInfo>> {
  const result = new Map<string, PlayerTeamInfo>()
  const sport = typeof sportType === 'string' ? sportType.toUpperCase() : String(sportType)
  const teamIdByAbbrev = getTeamIdByAbbreviationMap(sport)

  const players = await prisma.sportsPlayer.findMany({
    where: {
      sport,
      OR: [
        { id: { in: playerIds } },
        { sleeperId: { in: playerIds } },
        { externalId: { in: playerIds } },
      ],
    },
  })
  for (const p of players) {
    const key = p.sleeperId ?? p.externalId ?? p.id
    const abbr = p.team?.toUpperCase() ?? null
    result.set(key, {
      team_id: p.teamId ?? (abbr ? teamIdByAbbrev.get(abbr) ?? null : null),
      team_abbreviation: p.team ?? null,
      sport_type: sport,
    })
  }

  const found = new Set(result.keys())
  const missing = playerIds.filter((id) => !found.has(id))
  if (missing.length > 0) {
    const identities = await prisma.playerIdentityMap.findMany({
      where: {
        sport,
        OR: [
          { sleeperId: { in: missing } },
          { fantasyCalcId: { in: missing } },
          { apiSportsId: { in: missing } },
        ],
      },
    })
    for (const i of identities) {
      const key = i.sleeperId ?? i.fantasyCalcId ?? i.apiSportsId ?? ''
      if (key && !result.has(key)) {
        const abbr = i.currentTeam?.toUpperCase() ?? ''
        const teamId = abbr ? teamIdByAbbrev.get(abbr) ?? null : null
        result.set(key, {
          team_id: teamId,
          team_abbreviation: i.currentTeam ?? null,
          sport_type: sport,
        })
      }
    }
  }
  return result
}

/**
 * Resolve team for a player from an existing record (no DB). Use when you already have team on the object.
 */
export function mapPlayerToTeamFromRecord(player: {
  team?: string | null
  teamId?: string | null
  team_abbreviation?: string | null
  team_id?: string | null
}): PlayerTeamInfo | null {
  const abbr = player.team_abbreviation ?? player.team ?? null
  const id = player.team_id ?? player.teamId ?? null
  if (!abbr && !id) return null
  return {
    team_id: id ?? null,
    team_abbreviation: abbr ?? null,
    sport_type: '',
  }
}

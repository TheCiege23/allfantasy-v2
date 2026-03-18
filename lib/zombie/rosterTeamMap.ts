/**
 * Resolve rosterId <-> teamId (LeagueTeam.id) for a league. PROMPT 353.
 * MatchupFact and TeamPerformance use teamId; Zombie engine uses rosterId.
 * We build map by draft slot order (roster index = team index) or by roster/team count alignment.
 */

import { prisma } from '@/lib/prisma'

export interface RosterTeamMap {
  rosterIdToTeamId: Map<string, string>
  teamIdToRosterId: Map<string, string>
}

/**
 * Get roster <-> team mapping for a league. Uses draft slot order when available;
 * otherwise zips rosters and teams by id order (same count).
 */
export async function getRosterTeamMap(leagueId: string): Promise<RosterTeamMap> {
  const [rosters, teams, session] = await Promise.all([
    prisma.roster.findMany({
      where: { leagueId },
      select: { id: true },
      orderBy: { id: 'asc' },
    }),
    prisma.leagueTeam.findMany({
      where: { leagueId },
      select: { id: true },
      orderBy: [{ currentRank: 'asc' }, { id: 'asc' }],
    }),
    prisma.draftSession.findUnique({
      where: { leagueId },
      select: { slotOrder: true },
    }),
  ])

  const rosterIdToTeamId = new Map<string, string>()
  const teamIdToRosterId = new Map<string, string>()

  if (rosters.length !== teams.length) {
    return { rosterIdToTeamId, teamIdToRosterId }
  }

  const slotOrder = session?.slotOrder as Array<{ slot: number; rosterId: string }> | null
  if (Array.isArray(slotOrder) && slotOrder.length === rosters.length) {
    const rosterBySlot = new Map<number, string>()
    for (const o of slotOrder) {
      if (o?.rosterId != null && typeof o.slot === 'number') rosterBySlot.set(o.slot, String(o.rosterId))
    }
    for (let i = 0; i < teams.length; i++) {
      const rosterId = rosterBySlot.get(i + 1) ?? rosters[i]?.id
      const teamId = teams[i]?.id
      if (rosterId && teamId) {
        rosterIdToTeamId.set(rosterId, teamId)
        teamIdToRosterId.set(teamId, rosterId)
      }
    }
  } else {
    for (let i = 0; i < rosters.length; i++) {
      const rosterId = rosters[i]?.id
      const teamId = teams[i]?.id
      if (rosterId && teamId) {
        rosterIdToTeamId.set(rosterId, teamId)
        teamIdToRosterId.set(teamId, rosterId)
      }
    }
  }

  return { rosterIdToTeamId, teamIdToRosterId }
}

/**
 * Get weekly score for a roster (from TeamPerformance via teamId).
 */
export async function getRosterWeeklyScore(
  leagueId: string,
  rosterId: string,
  season: number,
  week: number
): Promise<number> {
  const map = await getRosterTeamMap(leagueId)
  const teamId = map.rosterIdToTeamId.get(rosterId)
  if (!teamId) return 0
  const perf = await prisma.teamPerformance.findFirst({
    where: { teamId, season, week },
    select: { points: true },
  })
  return perf?.points ?? 0
}

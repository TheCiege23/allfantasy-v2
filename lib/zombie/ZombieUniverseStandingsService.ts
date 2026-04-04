/**
 * Zombie universe standings: aggregate across linked leagues (PROMPT 353).
 */

import { prisma } from '@/lib/prisma'
import { getRosterTeamMap } from './rosterTeamMap'
import { getTotalWinningsByRoster } from './ZombieWeeklyWinningsLedger'

export interface UniverseStandingsRow {
  leagueId: string
  rosterId: string
  levelId: string
  levelName: string
  status: string
  totalPoints: number
  pointsPerWeek: number[]
  winnings: number
  serums: number
  weapons: number
  weekKilled: number | null
  killedByRosterId: string | null
}

export async function getUniverseStandings(
  universeId: string,
  season?: number
): Promise<UniverseStandingsRow[]> {
  const leagues = await prisma.zombieLeague.findMany({
    where: { universeId },
    include: { level: true, league: { select: { id: true }, include: { teams: { select: { id: true, pointsFor: true } } } } },
  })

  const out: UniverseStandingsRow[] = []

  for (const zl of leagues) {
    if (!zl.levelId || !zl.level) continue

    const teamRows = await prisma.zombieLeagueTeam.findMany({
      where: { leagueId: zl.leagueId },
      select: {
        rosterId: true,
        status: true,
        weekBecameZombie: true,
        killedByRosterId: true,
      },
    })
    const winnings = await getTotalWinningsByRoster(zl.leagueId)
    const pointsForByTeam = Object.fromEntries(zl.league.teams.map((t) => [t.id, t.pointsFor]))
    const { rosterIdToTeamId } = await getRosterTeamMap(zl.leagueId)

    for (const t of teamRows) {
      const teamId = rosterIdToTeamId.get(t.rosterId)
      const totalPoints = teamId ? pointsForByTeam[teamId] ?? 0 : 0
      out.push({
        leagueId: zl.leagueId,
        rosterId: t.rosterId,
        levelId: zl.levelId,
        levelName: zl.level.name,
        status: t.status,
        totalPoints,
        pointsPerWeek: [], // optional: fill from TeamPerformance per week
        winnings: winnings[t.rosterId] ?? 0,
        serums: 0, // aggregate from ZombieResourceLedger
        weapons: 0,
        weekKilled: t.weekBecameZombie,
        killedByRosterId: t.killedByRosterId,
      })
    }
  }

  for (const row of out) {
    const [serums, weapons] = await Promise.all([
      getResourceBalance(row.leagueId, row.rosterId, 'serum'),
      getResourceBalance(row.leagueId, row.rosterId, 'weapon'),
    ])
    row.serums = serums
    row.weapons = weapons
  }

  return out
}

async function getResourceBalance(leagueId: string, rosterId: string, resourceType: string): Promise<number> {
  const row = await prisma.zombieResourceLedger.findFirst({
    where: { leagueId, rosterId, resourceType },
    select: { balance: true },
  })
  return row?.balance ?? 0
}

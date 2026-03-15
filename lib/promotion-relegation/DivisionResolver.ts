/**
 * DivisionResolver — resolve divisions for a league; list divisions; get division by id.
 */

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { DivisionView } from './types'

export async function listDivisionsByLeague(
  leagueId: string,
  options?: { sport?: string | null }
): Promise<DivisionView[]> {
  const where: { leagueId: string; sport?: string } = { leagueId }
  if (options?.sport) where.sport = normalizeToSupportedSport(options.sport)

  const divisions = await prisma.leagueDivision.findMany({
    where,
    orderBy: { tierLevel: 'asc' },
    include: { _count: { select: { teams: true } } },
  })

  return divisions.map((d) => ({
    divisionId: d.id,
    leagueId: d.leagueId,
    tierLevel: d.tierLevel,
    sport: d.sport,
    name: d.name,
    teamCount: d._count.teams,
  }))
}

export async function getDivisionById(divisionId: string): Promise<DivisionView | null> {
  const d = await prisma.leagueDivision.findUnique({
    where: { id: divisionId },
    include: { _count: { select: { teams: true } } },
  })
  if (!d) return null
  return {
    divisionId: d.id,
    leagueId: d.leagueId,
    tierLevel: d.tierLevel,
    sport: d.sport,
    name: d.name,
    teamCount: d._count.teams,
  }
}

export async function resolveDivisionForTeam(teamId: string): Promise<DivisionView | null> {
  const team = await prisma.leagueTeam.findUnique({
    where: { id: teamId },
    include: { division: true },
  })
  if (!team?.division) return null
  const d = team.division
  const count = await prisma.leagueTeam.count({ where: { divisionId: d.id } })
  return {
    divisionId: d.id,
    leagueId: d.leagueId,
    tierLevel: d.tierLevel,
    sport: d.sport,
    name: d.name,
    teamCount: count,
  }
}

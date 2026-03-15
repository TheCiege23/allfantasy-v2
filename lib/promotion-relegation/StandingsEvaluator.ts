/**
 * StandingsEvaluator — evaluate standings within a division; compute promotion/relegation zones.
 */

import { prisma } from '@/lib/prisma'
import type { TeamStandingInDivision } from './types'

export interface StandingsInput {
  divisionId: string
  promoteCount: number
  relegateCount: number
}

/**
 * Get ordered standings for a division and mark promotion/relegation zones.
 * Lower tierLevel = higher division (tier 1 = top). Promotion zone = top N in lower tier; relegation zone = bottom N in higher tier.
 */
export async function getStandingsWithZones(
  input: StandingsInput
): Promise<TeamStandingInDivision[]> {
  const { divisionId, promoteCount, relegateCount } = input

  const division = await prisma.leagueDivision.findUnique({
    where: { id: divisionId },
  })
  if (!division) return []

  const teams = await prisma.leagueTeam.findMany({
    where: { divisionId },
    orderBy: [{ currentRank: 'asc' }, { pointsFor: 'desc' }, { wins: 'desc' }],
  })

  const total = teams.length
  const promotionZoneStart = 1
  const promotionZoneEnd = Math.min(promoteCount, total)
  const relegationZoneStart = Math.max(1, total - relegateCount + 1)
  const relegationZoneEnd = total

  return teams.map((t, i) => {
    const rank = i + 1
    const inPromotionZone = rank >= promotionZoneStart && rank <= promotionZoneEnd
    const inRelegationZone = rank >= relegationZoneStart && rank <= relegationZoneEnd

    return {
      teamId: t.id,
      teamName: t.teamName,
      ownerName: t.ownerName,
      divisionId: t.divisionId,
      tierLevel: division.tierLevel,
      wins: t.wins,
      losses: t.losses,
      ties: t.ties ?? 0,
      pointsFor: t.pointsFor,
      rank,
      inPromotionZone,
      inRelegationZone,
    }
  })
}

/**
 * Get standings for a division without zone info (for display when no rule exists).
 */
export async function getStandingsForDivision(
  divisionId: string
): Promise<TeamStandingInDivision[]> {
  const division = await prisma.leagueDivision.findUnique({
    where: { id: divisionId },
  })
  if (!division) return []

  const teams = await prisma.leagueTeam.findMany({
    where: { divisionId },
    orderBy: [{ currentRank: 'asc' }, { pointsFor: 'desc' }, { wins: 'desc' }],
  })

  return teams.map((t, i) => ({
    teamId: t.id,
    teamName: t.teamName,
    ownerName: t.ownerName,
    divisionId: t.divisionId,
    tierLevel: division.tierLevel,
    wins: t.wins,
    losses: t.losses,
    ties: t.ties ?? 0,
    pointsFor: t.pointsFor,
    rank: i + 1,
    inPromotionZone: false,
    inRelegationZone: false,
  }))
}

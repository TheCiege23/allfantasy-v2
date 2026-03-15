/**
 * DynastyQueryService — query dynasty projections for dashboard, trade context, AI.
 */

import { prisma } from '@/lib/prisma'
import { resolveSportForDynasty } from './SportDynastyResolver'
import type { DynastyProjectionOutput } from './types'

export async function getDynastyProjection(
  leagueId: string,
  teamId: string
): Promise<DynastyProjectionOutput | null> {
  const row = await prisma.dynastyProjection.findUnique({
    where: {
      uniq_dynasty_projection_league_team: { leagueId, teamId },
    },
  })
  if (!row) return null
  return {
    projectionId: row.projectionId,
    teamId: row.teamId,
    leagueId: row.leagueId,
    sport: row.sport,
    championshipWindowScore: row.championshipWindowScore,
    rebuildProbability: row.rebuildProbability,
    rosterStrength3Year: row.rosterStrength3Year,
    rosterStrength5Year: row.rosterStrength5Year,
    agingRiskScore: row.agingRiskScore,
    futureAssetScore: row.futureAssetScore,
    season: row.season ?? undefined,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function getDynastyProjectionsForLeague(
  leagueId: string,
  sport?: string
): Promise<DynastyProjectionOutput[]> {
  const where: { leagueId: string; sport?: string } = { leagueId }
  if (sport) where.sport = resolveSportForDynasty(sport)
  const rows = await prisma.dynastyProjection.findMany({
    where,
    orderBy: [{ rosterStrength3Year: 'desc' }, { championshipWindowScore: 'desc' }],
  })
  return rows.map((row) => ({
    projectionId: row.projectionId,
    teamId: row.teamId,
    leagueId: row.leagueId,
    sport: row.sport,
    championshipWindowScore: row.championshipWindowScore,
    rebuildProbability: row.rebuildProbability,
    rosterStrength3Year: row.rosterStrength3Year,
    rosterStrength5Year: row.rosterStrength5Year,
    agingRiskScore: row.agingRiskScore,
    futureAssetScore: row.futureAssetScore,
    season: row.season ?? undefined,
    createdAt: row.createdAt.toISOString(),
  }))
}

/**
 * For trade analyzer / AI: get dynasty context for a team (projection or null).
 */
export async function getDynastyContextForTeam(
  leagueId: string,
  teamId: string
): Promise<DynastyProjectionOutput | null> {
  return getDynastyProjection(leagueId, teamId)
}

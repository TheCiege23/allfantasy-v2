/**
 * DynastyProjectionGenerator — produces DynastyProjection from roster + picks + league context.
 * Uses existing DynastyProjectionEngine; maps to Prompt 32 output and persists to dynasty_projections.
 */

import { prisma } from '@/lib/prisma'
import { DynastyProjectionEngine } from '@/lib/dynasty-projection/DynastyProjectionEngine'
import type { DynastyLeagueContext, TeamDynastyInputs } from '@/lib/dynasty-projection/types'
import { valueFuturePicks } from '@/lib/dynasty-projection/DraftPickValueModel'
import { resolveSportForDynasty } from './SportDynastyResolver'
import { futureAssetScoreFromPicks } from './DynastyValueModel'
import type { DynastyProjectionOutput } from './types'

export async function generateDynastyProjection(
  inputs: TeamDynastyInputs,
  options?: { persist?: boolean }
): Promise<DynastyProjectionOutput> {
  const sport = resolveSportForDynasty(inputs.leagueContext.sport)
  const ctx: DynastyLeagueContext = { ...inputs.leagueContext, sport }
  const engine = new DynastyProjectionEngine(ctx)
  const snapshot = engine.projectTeam({ ...inputs, leagueContext: ctx })

  const pickValue = valueFuturePicks(inputs.futurePicks, ctx)
  const futureAssetScore = futureAssetScoreFromPicks(
    pickValue,
    inputs.leagueContext.teamCount || 12
  )

  const championshipWindowScore = Math.round(
    (snapshot.contenderProbability ?? 0) * 0.6 +
    (snapshot.windowStartYear != null && snapshot.windowEndYear != null
      ? Math.min(40, (snapshot.windowEndYear - snapshot.windowStartYear) * 10)
      : 0)
  )

  const output: DynastyProjectionOutput = {
    projectionId: '',
    teamId: inputs.teamId,
    leagueId: inputs.leagueId,
    sport,
    championshipWindowScore: Math.min(100, championshipWindowScore),
    rebuildProbability: snapshot.rebuildProbability ?? 0,
    rosterStrength3Year: snapshot.projectedStrength3Years ?? 0,
    rosterStrength5Year: snapshot.projectedStrength5Years ?? 0,
    agingRiskScore: snapshot.volatilityScore ?? 0,
    futureAssetScore,
    season: ctx.season,
    createdAt: new Date().toISOString(),
  }

  if (options?.persist) {
    const row = await prisma.dynastyProjection.upsert({
      where: {
        uniq_dynasty_projection_league_team: {
          leagueId: inputs.leagueId,
          teamId: inputs.teamId,
        },
      },
      create: {
        teamId: output.teamId,
        leagueId: output.leagueId,
        sport: output.sport,
        championshipWindowScore: output.championshipWindowScore,
        rebuildProbability: output.rebuildProbability,
        rosterStrength3Year: output.rosterStrength3Year,
        rosterStrength5Year: output.rosterStrength5Year,
        agingRiskScore: output.agingRiskScore,
        futureAssetScore: output.futureAssetScore,
        season: output.season ?? null,
      },
      update: {
        championshipWindowScore: output.championshipWindowScore,
        rebuildProbability: output.rebuildProbability,
        rosterStrength3Year: output.rosterStrength3Year,
        rosterStrength5Year: output.rosterStrength5Year,
        agingRiskScore: output.agingRiskScore,
        futureAssetScore: output.futureAssetScore,
        season: output.season ?? null,
      },
    })
    output.projectionId = row.projectionId
    output.createdAt = row.createdAt.toISOString()
  }

  return output
}

/**
 * Generate projections for all teams in a league (requires team inputs per team).
 */
export async function generateLeagueDynastyProjections(
  leagueId: string,
  sport: string,
  teamInputs: TeamDynastyInputs[],
  options?: { persist?: boolean }
): Promise<DynastyProjectionOutput[]> {
  const results: DynastyProjectionOutput[] = []
  for (const input of teamInputs) {
    results.push(await generateDynastyProjection(input, options))
  }
  return results
}

/**
 * MatchupSimulator — predicts outcome of a single head-to-head matchup.
 * Uses deterministic Monte Carlo with lineup slots, variance bands, and schedule factors.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { applyLeagueScoringToMatchupInput } from './applyLeagueScoringToMatchupInput'
import type { MatchupSimulationInput, MatchupSimulationOutput } from './types'
import { simulateDeterministicMatchup } from './DeterministicMatchupEngine'

export async function runMatchupSimulation(
  input: MatchupSimulationInput,
  options?: { persist?: boolean }
): Promise<MatchupSimulationOutput> {
  const resolved = await applyLeagueScoringToMatchupInput(input)
  const output = simulateDeterministicMatchup(resolved)

  if (options?.persist && resolved.leagueId) {
    const row = await prisma.matchupSimulationResult.create({
      data: {
        sport: output.sport,
        leagueId: output.leagueId ?? null,
        weekOrPeriod: output.weekOrPeriod,
        teamAId: resolved.teamA.teamId ?? null,
        teamBId: resolved.teamB.teamId ?? null,
        expectedScoreA: output.expectedScoreA,
        expectedScoreB: output.expectedScoreB,
        winProbabilityA: output.winProbabilityA,
        winProbabilityB: output.winProbabilityB,
        scoreDistributionA: output.scoreDistributionA != null ? (output.scoreDistributionA as Prisma.InputJsonValue) : undefined,
        scoreDistributionB: output.scoreDistributionB != null ? (output.scoreDistributionB as Prisma.InputJsonValue) : undefined,
        iterations: output.iterations,
      },
    })
    output.simulationId = row.simulationId
    output.createdAt = row.createdAt.toISOString()
  }

  return output
}

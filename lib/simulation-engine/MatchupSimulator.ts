/**
 * MatchupSimulator — predicts outcome of a single head-to-head matchup.
 * Uses deterministic Monte Carlo with lineup slots, variance bands, and schedule factors.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { MatchupSimulationInput, MatchupSimulationOutput } from './types'
import { simulateDeterministicMatchup } from './DeterministicMatchupEngine'

export async function runMatchupSimulation(
  input: MatchupSimulationInput,
  options?: { persist?: boolean }
): Promise<MatchupSimulationOutput> {
  const output = simulateDeterministicMatchup(input)

  if (options?.persist && input.leagueId) {
    const row = await prisma.matchupSimulationResult.create({
      data: {
        sport: output.sport,
        leagueId: output.leagueId ?? null,
        weekOrPeriod: output.weekOrPeriod,
        teamAId: input.teamA.teamId ?? null,
        teamBId: input.teamB.teamId ?? null,
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

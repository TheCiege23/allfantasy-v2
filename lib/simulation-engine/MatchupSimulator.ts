/**
 * MatchupSimulator — predicts outcome of a single head-to-head matchup.
 * Uses Monte Carlo (normal distribution); sport-aware stdDev defaults.
 */

import type { Prisma } from '@prisma/client'
import { simulateMatchup } from '@/lib/monte-carlo'
import { prisma } from '@/lib/prisma'
import type { MatchupSimulationInput, MatchupSimulationOutput } from './types'
import { normalizeSportForSimulation } from './types'
import { getDefaultScoreStdDev, getVolatilityTag } from './SportSimulationResolver'
import { sampleScoreDistribution } from './ScoreDistributionModel'

const DEFAULT_ITERATIONS = 2000
const MAX_ITERATIONS = 5000

export async function runMatchupSimulation(
  input: MatchupSimulationInput,
  options?: { persist?: boolean }
): Promise<MatchupSimulationOutput> {
  const sport = normalizeSportForSimulation(input.sport)
  const stdDevA = input.teamA.stdDev ?? getDefaultScoreStdDev(sport)
  const stdDevB = input.teamB.stdDev ?? getDefaultScoreStdDev(sport)
  const iterations = Math.min(
    Math.max(100, input.iterations ?? DEFAULT_ITERATIONS),
    MAX_ITERATIONS
  )

  const result = simulateMatchup(
    { mean: input.teamA.mean, stdDev: stdDevA },
    { mean: input.teamB.mean, stdDev: stdDevB },
    iterations
  )

  const winProbA = result.winProbability
  const winProbB = 1 - winProbA
  const underdogWinProb = Math.min(winProbA, winProbB)
  const upsetChance = Math.round(underdogWinProb * 1000) / 10
  const volTag = getVolatilityTag((stdDevA + stdDevB) / 2)

  const distASamples = sampleScoreDistribution(input.teamA.mean, stdDevA, Math.min(500, iterations))
  const distBSamples = sampleScoreDistribution(input.teamB.mean, stdDevB, Math.min(500, iterations))
  distASamples.sort((a, b) => a - b)
  distBSamples.sort((a, b) => a - b)

  const output: MatchupSimulationOutput = {
    sport,
    leagueId: input.leagueId,
    weekOrPeriod: input.weekOrPeriod,
    expectedScoreA: input.teamA.mean,
    expectedScoreB: input.teamB.mean,
    winProbabilityA: Math.round(winProbA * 1000) / 1000,
    winProbabilityB: Math.round(winProbB * 1000) / 1000,
    scoreDistributionA: distASamples.slice(0, 100),
    scoreDistributionB: distBSamples.slice(0, 100),
    marginMean: result.marginMean,
    marginStdDev: result.marginStdDev,
    upsetChance,
    volatilityTag: volTag,
    iterations,
  }

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

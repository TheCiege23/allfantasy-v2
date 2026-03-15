/**
 * SeasonSimulator — full season standings and playoff/championship odds.
 * Delegates to season-forecast engine; optionally persists to SeasonSimulationResult.
 */

import { prisma } from '@/lib/prisma'
import { runSeasonForecast } from '@/lib/season-forecast/SeasonForecastEngine'
import type { SeasonSimulationInput, SeasonSimulationOutput, SeasonSimulationTeamOutput } from './types'
import { normalizeSportForSimulation } from './types'

export async function runSeasonSimulation(
  input: SeasonSimulationInput,
  options?: { persist?: boolean }
): Promise<SeasonSimulationOutput | null> {
  const sport = normalizeSportForSimulation(input.sport)
  const result = await runSeasonForecast({
    leagueId: input.leagueId,
    season: input.season,
    week: input.weekOrPeriod,
    totalWeeks: input.totalWeeks,
    playoffSpots: input.playoffSpots,
    byeSpots: input.byeSpots,
    simulations: input.simulations,
  })

  if (!result?.teamForecasts) return null

  const teamResults: SeasonSimulationTeamOutput[] = result.teamForecasts.map((t) => ({
    teamId: t.teamId,
    playoffProbability: t.playoffProbability ?? 0,
    championshipProbability: t.championshipProbability ?? t.firstPlaceProbability ?? 0,
    expectedWins: t.expectedWins ?? 0,
    expectedRank: t.expectedFinalSeed ?? 0,
  }))

  const simulationsRun = input.simulations ?? 2000

  const output: SeasonSimulationOutput = {
    sport,
    leagueId: input.leagueId,
    season: input.season,
    weekOrPeriod: input.weekOrPeriod,
    teamResults,
    simulationsRun,
    resultId: result.snapshotId ?? undefined,
    createdAt: new Date().toISOString(),
  }

  if (options?.persist) {
    for (const t of teamResults) {
      await prisma.seasonSimulationResult.create({
        data: {
          sport: output.sport,
          leagueId: output.leagueId,
          teamId: t.teamId,
          season: output.season,
          weekOrPeriod: output.weekOrPeriod,
          playoffProbability: t.playoffProbability,
          championshipProbability: t.championshipProbability,
          expectedWins: t.expectedWins,
          expectedRank: t.expectedRank,
          simulationsRun,
        },
      })
    }
  }

  return output
}

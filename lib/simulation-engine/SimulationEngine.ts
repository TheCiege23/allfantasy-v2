/**
 * SimulationEngine — orchestrator for matchup, season, and score-distribution simulations.
 * Single entry for AI matchup predictions, playoff odds, and dashboard cards.
 */

import { runMatchupSimulation } from './MatchupSimulator'
import { runSeasonSimulation } from './SeasonSimulator'
import { buildScoreDistribution } from './ScoreDistributionModel'
import type { MatchupSimulationInput, MatchupSimulationOutput } from './types'
import type { SeasonSimulationInput, SeasonSimulationOutput } from './types'

export { calculatePlayoffOdds } from '@/lib/season-forecast/PlayoffOddsCalculator'
export type { TeamPlayoffOdds } from '@/lib/season-forecast/PlayoffOddsCalculator'

/**
 * Run a single matchup simulation (optionally persist).
 */
export async function runMatchup(
  input: MatchupSimulationInput,
  options?: { persist?: boolean }
): Promise<MatchupSimulationOutput> {
  return runMatchupSimulation(input, options)
}

/**
 * Run full season simulation (playoff/championship odds, expected wins/rank).
 */
export async function runSeason(
  input: SeasonSimulationInput,
  options?: { persist?: boolean }
): Promise<SeasonSimulationOutput | null> {
  return runSeasonSimulation(input, options)
}

/**
 * Build score distribution for a single team (mean, stdDev) — for charts and volatility.
 */
export function getScoreDistribution(mean: number, stdDev: number, iterations = 1000) {
  return buildScoreDistribution(mean, stdDev, iterations)
}

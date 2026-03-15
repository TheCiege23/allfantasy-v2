/**
 * SportSimulationResolver — sport-aware simulation parameters and validation.
 * Tuning (e.g. default stdDev, volatility) can differ by sport.
 */

import { SIMULATION_SPORTS, normalizeSportForSimulation, type SimulationSport } from './types'

export function getSimulationSports(): readonly SimulationSport[] {
  return SIMULATION_SPORTS
}

export function resolveSportForSimulation(sport: string): SimulationSport {
  return normalizeSportForSimulation(sport)
}

/**
 * Default score stdDev by sport (for matchup sim when not provided).
 * Higher = more volatile scoring.
 */
export function getDefaultScoreStdDev(sport: string): number {
  const s = normalizeSportForSimulation(sport)
  const map: Record<SimulationSport, number> = {
    NFL: 15,
    NHL: 18,
    NBA: 12,
    MLB: 14,
    NCAAB: 16,
    NCAAF: 14,
    SOCCER: 10,
  }
  return map[s] ?? 15
}

/**
 * Volatility tag from combined stdDev (for display).
 */
export function getVolatilityTag(combinedStdDev: number): 'low' | 'medium' | 'high' {
  if (combinedStdDev >= 20) return 'high'
  if (combinedStdDev >= 14) return 'medium'
  return 'low'
}

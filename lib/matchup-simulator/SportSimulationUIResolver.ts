/**
 * SportSimulationUIResolver — sport-aware UI labels for simulation (volatility, sport name).
 * Aligns with lib/sport-scope and simulation-engine SportSimulationResolver.
 */

import { SUPPORTED_SPORTS, normalizeToSupportedSport } from '@/lib/sport-scope'
import { getDefaultScoreStdDev, getVolatilityTag } from '@/lib/simulation-engine/SportSimulationResolver'

export type SportOption = { value: string; label: string }

const SPORT_LABELS: Record<string, string> = {
  NFL: 'NFL',
  NHL: 'NHL',
  NBA: 'NBA',
  MLB: 'MLB',
  NCAAB: 'NCAA Basketball',
  NCAAF: 'NCAA Football',
  SOCCER: 'Soccer',
}

/**
 * Options for sport selector (e.g. Simulation Lab, matchup simulator).
 */
export function getSportOptionsForSimulation(): SportOption[] {
  return SUPPORTED_SPORTS.map((s) => ({
    value: s,
    label: SPORT_LABELS[s] ?? s,
  }))
}

/**
 * Display label for a sport in simulation UI.
 */
export function getSportLabel(sport: string): string {
  const normalized = normalizeToSupportedSport(sport)
  return SPORT_LABELS[normalized] ?? normalized
}

/**
 * Default score stdDev for a sport (for inputs when not provided).
 */
export function getDefaultStdDevForSport(sport: string): number {
  return getDefaultScoreStdDev(sport)
}

/**
 * Volatility tag from combined stdDev (low/medium/high).
 */
export function getVolatilityLabel(combinedStdDev: number): 'low' | 'medium' | 'high' {
  return getVolatilityTag(combinedStdDev)
}

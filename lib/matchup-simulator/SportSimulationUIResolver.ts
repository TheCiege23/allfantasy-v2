/**
 * SportSimulationUIResolver — sport-aware UI labels for simulation (volatility, sport name).
 * Aligns with lib/sport-scope and simulation-engine SportSimulationResolver.
 */

import { SUPPORTED_SPORTS, normalizeToSupportedSport } from '@/lib/sport-scope'
import { getDefaultScoreStdDev, getVolatilityTag } from '@/lib/simulation-engine/SportSimulationResolver'

export type SportOption = { value: string; label: string }
export type SimulationTeamPreset = {
  id: string
  name: string
  mean: number
  stdDev: number
}

const SPORT_LABELS: Record<string, string> = {
  NFL: 'NFL',
  NHL: 'NHL',
  NBA: 'NBA',
  MLB: 'MLB',
  NCAAB: 'NCAA Basketball',
  NCAAF: 'NCAA Football',
  SOCCER: 'Soccer',
}

const SPORT_TEAM_PRESETS: Record<string, SimulationTeamPreset[]> = {
  NFL: [
    { id: 'nfl-sharks', name: 'Gridiron Sharks', mean: 119, stdDev: 14 },
    { id: 'nfl-wolves', name: 'Sunday Wolves', mean: 112, stdDev: 15 },
    { id: 'nfl-hawks', name: 'Red Zone Hawks', mean: 116, stdDev: 13 },
  ],
  NHL: [
    { id: 'nhl-blades', name: 'Ice Blades', mean: 42, stdDev: 7 },
    { id: 'nhl-pucks', name: 'Power Play Pucks', mean: 40, stdDev: 8 },
    { id: 'nhl-frost', name: 'Frostbite Line', mean: 44, stdDev: 7 },
  ],
  NBA: [
    { id: 'nba-rim', name: 'Rim Runners', mean: 131, stdDev: 16 },
    { id: 'nba-glass', name: 'Glass Cleaners', mean: 126, stdDev: 15 },
    { id: 'nba-break', name: 'Fast Break Union', mean: 129, stdDev: 14 },
  ],
  MLB: [
    { id: 'mlb-bats', name: 'Launch Angle Bats', mean: 57, stdDev: 10 },
    { id: 'mlb-aces', name: 'Bullpen Aces', mean: 54, stdDev: 9 },
    { id: 'mlb-rbi', name: 'RBI Syndicate', mean: 56, stdDev: 9 },
  ],
  NCAAB: [
    { id: 'ncaab-court', name: 'Campus Court Kings', mean: 123, stdDev: 16 },
    { id: 'ncaab-press', name: 'Full Court Press', mean: 118, stdDev: 15 },
    { id: 'ncaab-rim', name: 'March Rims', mean: 121, stdDev: 15 },
  ],
  NCAAF: [
    { id: 'ncaaf-option', name: 'Triple Option Co.', mean: 114, stdDev: 15 },
    { id: 'ncaaf-dynasty', name: 'Saturday Dynasty', mean: 110, stdDev: 16 },
    { id: 'ncaaf-uptempo', name: 'Up Tempo U', mean: 113, stdDev: 14 },
  ],
  SOCCER: [
    { id: 'soccer-pitch', name: 'Pitch Control FC', mean: 62, stdDev: 10 },
    { id: 'soccer-counter', name: 'Counter Attack XI', mean: 59, stdDev: 9 },
    { id: 'soccer-press', name: 'High Press City', mean: 61, stdDev: 9 },
  ],
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

export function getSimulationTeamPresets(sport: string): SimulationTeamPreset[] {
  const normalized = normalizeToSupportedSport(sport)
  return SPORT_TEAM_PRESETS[normalized] ?? SPORT_TEAM_PRESETS.NFL
}

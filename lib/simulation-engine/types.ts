/**
 * Simulation Engine — shared types. Sport-aware across NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer.
 */

export const SIMULATION_SPORTS = [
  'NFL',
  'NHL',
  'NBA',
  'MLB',
  'NCAAB',
  'NCAAF',
  'SOCCER',
] as const

export type SimulationSport = (typeof SIMULATION_SPORTS)[number]

export function normalizeSportForSimulation(sport: string): SimulationSport {
  const u = sport?.toUpperCase?.() || 'NFL'
  if (SIMULATION_SPORTS.includes(u as SimulationSport)) return u as SimulationSport
  const map: Record<string, SimulationSport> = {
    NFL: 'NFL',
    NHL: 'NHL',
    NBA: 'NBA',
    MLB: 'MLB',
    NCAAB: 'NCAAB',
    NCAAF: 'NCAAF',
    SOCCER: 'SOCCER',
  }
  return map[u] ?? 'NFL'
}

export interface MatchupSimulationInput {
  sport: string
  leagueId?: string
  weekOrPeriod: number
  teamA: { mean: number; stdDev?: number; teamId?: string }
  teamB: { mean: number; stdDev?: number; teamId?: string }
  iterations?: number
}

/** Upside/downside scenario (Prompt 133). */
export interface ScenarioScore {
  teamA: number
  teamB: number
  /** e.g. 90 = upside, 10 = downside */
  percentile: number
}

export interface MatchupSimulationOutput {
  simulationId?: string
  sport: string
  leagueId?: string
  weekOrPeriod: number
  expectedScoreA: number
  expectedScoreB: number
  winProbabilityA: number
  winProbabilityB: number
  scoreDistributionA?: number[]
  scoreDistributionB?: number[]
  marginMean: number
  marginStdDev: number
  upsetChance: number
  volatilityTag: 'low' | 'medium' | 'high'
  iterations: number
  createdAt?: string
  /** Upside scenario (e.g. 90th percentile scores). */
  upsideScenario?: ScenarioScore
  /** Downside scenario (e.g. 10th percentile scores). */
  downsideScenario?: ScenarioScore
}

export interface SeasonSimulationInput {
  leagueId: string
  sport: string
  season: number
  weekOrPeriod: number
  totalWeeks?: number
  playoffSpots?: number
  byeSpots?: number
  simulations?: number
}

export interface SeasonSimulationTeamOutput {
  teamId: string
  playoffProbability: number
  championshipProbability: number
  expectedWins: number
  expectedRank: number
}

export interface SeasonSimulationOutput {
  resultId?: string
  sport: string
  leagueId: string
  season: number
  weekOrPeriod: number
  teamResults: SeasonSimulationTeamOutput[]
  simulationsRun: number
  createdAt?: string
}

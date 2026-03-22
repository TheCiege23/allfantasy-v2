/**
 * Simulation Engine — shared types. Sport-aware across NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer.
 */
import {
  DEFAULT_SPORT,
  SUPPORTED_SPORTS,
  normalizeToSupportedSport,
  type SupportedSport,
} from '@/lib/sport-scope'

export const SIMULATION_SPORTS: readonly SupportedSport[] = [...SUPPORTED_SPORTS]

export type SimulationSport = SupportedSport

export function normalizeSportForSimulation(sport: string): SimulationSport {
  const u = sport?.toUpperCase?.() || DEFAULT_SPORT
  if (SIMULATION_SPORTS.includes(u as SimulationSport)) return normalizeToSupportedSport(u)
  const map: Record<string, SimulationSport> = {
    NFL: 'NFL',
    NHL: 'NHL',
    NBA: 'NBA',
    MLB: 'MLB',
    NCAAB: 'NCAAB',
    NCAAF: 'NCAAF',
    SOCCER: 'SOCCER',
  }
  return normalizeToSupportedSport(map[u] ?? u)
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

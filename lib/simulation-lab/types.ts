/**
 * Platform Simulation Lab — sandbox types for season, playoff, and dynasty simulations.
 */

export interface TeamProjectionInput {
  mean: number
  stdDev?: number
  name?: string
  teamId?: string
}

export interface SeasonSimLabInput {
  team: TeamProjectionInput
  opponents: TeamProjectionInput[]
  playoffSpots: number
  byeSpots?: number
  iterations?: number
}

export interface SeasonSimLabResult {
  expectedWins: number
  playoffProbability: number
  byeWeekProbability: number
  iterations: number
}

export interface PlayoffSimLabInput {
  teams: TeamProjectionInput[]
  targetTeamIndex: number
  iterations?: number
}

export interface PlayoffSimLabResult {
  championshipProbability: number
  finalistProbability: number
  iterations: number
}

export interface DynastySimLabInput {
  teams: TeamProjectionInput[]
  seasons: number
  playoffSpots: number
  iterationsPerSeason?: number
}

export interface DynastyTeamOutcome {
  teamIndex: number
  name?: string
  championships: number
  totalWins: number
  avgFinish: number
  playoffAppearances: number
}

export interface DynastySimLabResult {
  seasonsRun: number
  outcomes: DynastyTeamOutcome[]
  iterationsPerSeason: number
}

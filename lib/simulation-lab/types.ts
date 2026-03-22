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
  sport?: string
  team: TeamProjectionInput
  opponents: TeamProjectionInput[]
  playoffSpots: number
  byeSpots?: number
  iterations?: number
}

export interface SeasonSimLabResult {
  sport: string
  expectedWins: number
  playoffProbability: number
  byeWeekProbability: number
  iterations: number
}

export interface PlayoffSimLabInput {
  sport?: string
  teams: TeamProjectionInput[]
  targetTeamIndex: number
  iterations?: number
}

export interface PlayoffSimLabResult {
  sport: string
  championshipProbability: number
  finalistProbability: number
  iterations: number
}

export interface DynastySimLabInput {
  sport?: string
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
  sport: string
  seasonsRun: number
  outcomes: DynastyTeamOutcome[]
  iterationsPerSeason: number
}

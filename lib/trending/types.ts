/**
 * Trending system (PROMPT 300) — types for trending leagues, players, matchups.
 */

export interface TrendingLeague {
  leagueId: string
  name: string
  sport?: string
  score: number
  activityCount: number
  engagementCount: number
  joinCount: number
  rank: number
}

export interface TrendingPlayer {
  sleeperId: string
  playerName: string | null
  position: string | null
  team: string | null
  sport: string
  score: number
  addCount: number
  dropCount: number
  netTrend: number
  crowdSignal: string
  rank: number
}

export interface TrendingMatchup {
  leagueId: string
  leagueName: string
  matchupLabel: string
  sport?: string
  score: number
  rank: number
}

export interface TrendingOptions {
  /** Lookback days (default 7) */
  lookbackDays?: number
  /** Max items (default 20) */
  limit?: number
  /** Sport filter (optional) */
  sport?: string
}

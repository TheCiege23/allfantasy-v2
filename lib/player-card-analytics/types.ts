/**
 * Player Card Analytics — types for advanced player cards.
 */

export interface PlayerCardMetaTrend {
  trendScore: number
  addRate: number
  dropRate: number
  tradeRate: number
  draftRate: number
  trendingDirection: string
  updatedAt: string
}

export interface PlayerCardMatchupPrediction {
  expectedPoints?: number | null
  expectedPointsPerGame?: number | null
  outlook?: string
  opponentTier?: string
}

export interface PlayerCardCareerProjection {
  projectedPointsYear1: number
  projectedPointsYear2: number
  projectedPointsYear3: number
  projectedPointsYear4: number
  projectedPointsYear5: number
  breakoutProbability: number
  declineProbability: number
  volatilityScore: number
  season: number
}

/** One row of historical season stats for a player (from PlayerSeasonStats). */
export interface PlayerCardSeasonStat {
  season: string
  gamesPlayed: number | null
  fantasyPoints: number | null
  fantasyPointsPerGame: number | null
  team: string | null
  stats: Record<string, unknown>
}

export interface PlayerCardAnalyticsPayload {
  playerId: string | null
  playerName: string
  position: string | null
  team: string | null
  sport: string
  aiInsights: string | null
  metaTrends: PlayerCardMetaTrend | null
  matchupPrediction: PlayerCardMatchupPrediction | null
  careerProjection: PlayerCardCareerProjection | null
  /** Historical season stats from DB (multi-sport, DB-first). */
  seasonHistory: PlayerCardSeasonStat[] | null
}

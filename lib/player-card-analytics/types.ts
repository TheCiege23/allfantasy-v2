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
}

/**
 * League Ranking System (PROMPT 220) — types.
 * Rank leagues by activity and quality; display league popularity score.
 */

export interface LeagueRankingMetrics {
  /** Total chat messages in league (all time or window). */
  chatMessageCount: number
  /** Waiver/transaction count (proxy for trade/waiver activity). */
  transactionCount: number
  /** Whether league has had a completed draft; draft pick count when available. */
  draftParticipation: { hasCompletedDraft: boolean; pickCount: number }
  /** Current roster (manager) count. */
  managerCount: number
  /** Configured league size (max managers). */
  leagueSize: number | null
  /** Last activity timestamp (chat, transaction, or draft). */
  lastActivityAt: Date | null
}

export interface LeaguePopularityScore {
  /** Composite 0–100 score. */
  score: number
  /** Component scores (0–1 normalized) for display or debugging. */
  components: {
    chatActivity: number
    transactionActivity: number
    draftParticipation: number
    managerRetention: number
    recency: number
  }
}

export interface RankedLeague {
  leagueId: string
  leagueName: string | null
  sport: string
  popularityScore: LeaguePopularityScore
  metrics: LeagueRankingMetrics
}

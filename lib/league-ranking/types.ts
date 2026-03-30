/**
 * League Ranking System (PROMPT 220) — types.
 * Rank leagues by activity and quality; display league popularity score.
 */

export interface LeagueRankingMetrics {
  /** Composite recent activity event count (league activity). */
  leagueActivityCount: number
  /** Total chat messages in league (all time or window). */
  chatMessageCount: number
  /** Trade-frequency signal count (offers + outcomes in window). */
  tradeFrequencyCount: number
  /** Waiver/transaction count (proxy for trade/waiver activity). */
  transactionCount: number
  /** Whether league has had a completed draft; draft pick/session activity. */
  draftParticipation: {
    hasCompletedDraft: boolean
    pickCount: number
    sessionCount: number
    activeSessionCount: number
  }
  /** Current roster (manager) count. */
  managerCount: number
  /** Configured league size (max managers). */
  leagueSize: number | null
  /** Roster slots retained beyond retention cutoff. */
  retainedManagerCount: number
  /** Normalized retention ratio [0..1]. */
  managerRetentionRate: number
  /** Approximate active managers from recent chat/trade participation. */
  activeManagerCount: number
  /** Last activity timestamp (chat, transaction, or draft). */
  lastActivityAt: Date | null
}

export interface LeaguePopularityScore {
  /** Composite 0–100 score. */
  score: number
  /** Component scores (0–1 normalized) for display or debugging. */
  components: {
    leagueActivity: number
    chatActivity: number
    tradeFrequency: number
    draftParticipation: number
    managerRetention: number
    /** Deprecated alias for compatibility. */
    transactionActivity?: number
    /** Extra diagnostic value; not part of weighted score. */
    recency?: number
  }
}

export interface RankedLeague {
  leagueId: string
  leagueName: string | null
  sport: string
  popularityScore: LeaguePopularityScore
  metrics: LeagueRankingMetrics
}

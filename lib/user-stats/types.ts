/**
 * Cross-League User Stats (PROMPT 221) — types.
 * Track performance across all leagues: wins, losses, championships, playoff appearances, draft grades, trade success.
 */

export interface CrossLeagueUserStats {
  /** Total wins across all leagues/seasons. */
  wins: number
  /** Total losses across all leagues/seasons. */
  losses: number
  /** Total ties if available. */
  ties: number
  /** Number of championships (seasonResult.champion or equivalent). */
  championships: number
  /** Number of playoff appearances (seasons with at least one result). */
  playoffAppearances: number
  /** Draft grades: count and average score (0–100). */
  draftGrades: {
    count: number
    averageScore: number
    latestGrade: string | null
  }
  /** Trade success: sent, accepted, acceptance rate (0–1). */
  tradeSuccess: {
    tradesSent: number
    tradesAccepted: number
    acceptanceRate: number
  }
  /** Leagues/seasons included (for display). */
  seasonsPlayed: number
  leaguesPlayed: number
}

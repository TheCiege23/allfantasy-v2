/**
 * Weekly Recap Engine (PROMPT 306) — types.
 * Summarize user performance: wins/losses, best players, AI insights.
 */

export interface LeagueRecord {
  wins: number
  losses: number
  ties: number
}

export interface WeeklyRecapLeague {
  leagueId: string
  leagueName: string
  sport?: string
  /** User's record in this league (when we can resolve their team). */
  myRecord?: LeagueRecord
  /** Rank (1-based) when known. */
  rank?: number
  /** Points for (season) when known. */
  pointsFor?: number
}

export interface WeeklyRecapPlayer {
  name: string
  position?: string
  /** Points last week or season when available. */
  points?: number
  reason?: string
}

export interface WeeklyRecapPayload {
  /** Period label (e.g. "Last 7 days"). */
  period: string
  /** Total wins across leagues where we resolved user's team. */
  totalWins: number
  /** Total losses. */
  totalLosses: number
  /** Total ties. */
  totalTies: number
  /** Per-league breakdown. */
  leagues: WeeklyRecapLeague[]
  /** Top performers (placeholder or from data). */
  bestPlayers: WeeklyRecapPlayer[]
  /** Short AI insight bullets (placeholder or from Chimmy/AI). */
  aiInsights: string[]
  /** Optional summary sentence for notification. */
  summary?: string
}

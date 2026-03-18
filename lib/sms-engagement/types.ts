/**
 * SMS Engagement System (PROMPT 303) — types for critical alerts.
 * Draft alerts, trade alerts, matchup reminders.
 */

/** Draft alert types for SMS. */
export type DraftAlertType =
  | "on_the_clock"
  | "timer_warning"
  | "draft_starting_soon"
  | "auto_pick"
  | "queue_player_taken"
  | "trade_offer"
  | "paused"
  | "resumed"

export interface DraftAlertPayload {
  leagueName: string
  type: DraftAlertType
  /** e.g. "Round 5, Pick 52" */
  pickLabel?: string
  /** e.g. minutes until lock */
  minutesRemaining?: number
  /** e.g. player name for auto-pick */
  playerName?: string
}

/** Trade alert types. */
export type TradeAlertType = "proposal" | "accepted" | "rejected"

export interface TradeAlertPayload {
  leagueName: string
  type: TradeAlertType
  /** Optional short detail (e.g. "from Team A") */
  detail?: string
}

/** Matchup reminder types. */
export type MatchupReminderType =
  | "lineup_lock_soon"
  | "lineup_locked"
  | "matchup_result"
  | "matchup_reminder"

export interface MatchupReminderPayload {
  leagueName: string
  type: MatchupReminderType
  /** e.g. week number */
  week?: number
  /** e.g. minutes until lock */
  minutesRemaining?: number
  /** e.g. "You won 124-98" */
  resultSummary?: string
}

/** Result of sending one SMS. */
export interface SmsSendResult {
  ok: boolean
  userId: string
  error?: string
}

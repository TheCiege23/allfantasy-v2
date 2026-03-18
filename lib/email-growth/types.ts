/**
 * Email Growth System (PROMPT 302) — types.
 * Flows: weekly summaries, AI insights, league updates.
 */

/** Payload for the weekly summary email. */
export interface WeeklySummaryPayload {
  to: string
  userName?: string | null
  leagueViews: number
  bracketViews: number
  aiUses: number
  ctaHref: string
  ctaLabel: string
}

/** Payload for a single AI insight email. */
export interface AIInsightPayload {
  to: string
  userName?: string | null
  title: string
  body: string
  ctaHref?: string
  ctaLabel?: string
  /** e.g. "trade_grade" | "waiver_tip" | "chimmy_insight" */
  insightType?: string
}

/** League update type for email. */
export type LeagueUpdateType = "matchup_result" | "trade_alert" | "waiver_processed" | "draft_reminder" | "league_activity"

/** Payload for a league update email. */
export interface LeagueUpdatePayload {
  to: string
  userName?: string | null
  leagueName: string
  leagueId: string
  updateType: LeagueUpdateType
  title: string
  body: string
  ctaHref: string
  ctaLabel?: string
  meta?: Record<string, unknown>
}

/** Result of sending one email in a flow. */
export interface EmailFlowSendResult {
  ok: boolean
  to: string
  error?: string
}

/** Result of running a batch flow (e.g. weekly summary to many users). */
export interface EmailFlowBatchResult {
  sent: number
  failed: number
  skipped: number
  errors: Array<{ to: string; error: string }>
}

/**
 * Engagement engine — retention, notifications, weekly recaps.
 */

export type EngagementEventType =
  | "league_view"
  | "bracket_view"
  | "ai_used"
  | "trade_analyzer"
  | "mock_draft"
  | "waiver_ai"
  | "chimmy_chat"
  | "lineup_edit"
  | "draft_completed"

export type EngagementNotificationType =
  | "daily_digest"
  | "league_reminder"
  | "ai_insight"
  | "weekly_recap"

export interface EngagementEventMeta {
  leagueId?: string
  bracketLeagueId?: string
  product?: "app" | "bracket" | "legacy"
  [key: string]: unknown
}

export interface WeeklyRecapPayload {
  title: string
  body: string
  /** Deep link for notification click. */
  actionHref: string
  actionLabel: string
  /** Summary stats for body. */
  leagueViews?: number
  aiUses?: number
  bracketViews?: number
}

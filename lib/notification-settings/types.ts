/**
 * Notification preference per category: enabled + delivery channels.
 */

export type NotificationCategoryId =
  | "lineup_reminders"
  | "matchup_results"
  | "waiver_processing"
  | "trade_proposals"
  | "trade_accept_reject"
  | "chat_mentions"
  | "bracket_updates"
  | "ai_alerts"
  | "league_drama"
  | "commissioner_alerts"
  | "system_account"
  | "injury_alerts"
  | "performance_alerts"
  | "lineup_alerts"
  | "draft_alerts"

export interface NotificationChannelPrefs {
  enabled: boolean
  inApp: boolean
  email: boolean
  sms: boolean
}

export interface NotificationPreferences {
  globalEnabled?: boolean
  categories?: Partial<Record<NotificationCategoryId, NotificationChannelPrefs>>
}

export const NOTIFICATION_CATEGORY_IDS: NotificationCategoryId[] = [
  "lineup_reminders",
  "matchup_results",
  "waiver_processing",
  "trade_proposals",
  "trade_accept_reject",
  "chat_mentions",
  "bracket_updates",
  "ai_alerts",
  "league_drama",
  "commissioner_alerts",
  "system_account",
  "injury_alerts",
  "performance_alerts",
  "lineup_alerts",
  "draft_alerts",
]

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategoryId, string> = {
  lineup_reminders: "Lineup reminders",
  matchup_results: "Matchup results",
  waiver_processing: "Waiver processing",
  trade_proposals: "Trade proposals",
  trade_accept_reject: "Trade accept / reject",
  chat_mentions: "Chat mentions",
  bracket_updates: "Bracket updates",
  ai_alerts: "AI alerts",
  league_drama: "League drama / storylines",
  commissioner_alerts: "Commissioner alerts",
  system_account: "System & account alerts",
  injury_alerts: "Player injury alerts",
  performance_alerts: "Game performance alerts",
  lineup_alerts: "Starting lineup alerts",
  draft_alerts: "Draft alerts (on the clock, timer, trade offers)",
}

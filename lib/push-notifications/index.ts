/**
 * Push Notifications (PROMPT 304).
 * Web push for AI alerts, chat mentions, league updates.
 */

export * from "./types"
export {
  savePushSubscription,
  removePushSubscription,
  getPushSubscriptions,
  sendPushToUser,
} from "./push-service"

/** Categories that trigger a browser push when user has subscribed. */
export const PUSH_NOTIFICATION_CATEGORIES = [
  "ai_alerts",
  "chat_mentions",
  "league_announcements",
  "matchup_results",
  "lineup_reminders",
  "league_drama",
  "commissioner_alerts",
  "draft_intel_alerts",
] as const

export type PushNotificationCategory = (typeof PUSH_NOTIFICATION_CATEGORIES)[number]

export function isPushCategory(category: string): category is PushNotificationCategory {
  return (PUSH_NOTIFICATION_CATEGORIES as readonly string[]).includes(category)
}

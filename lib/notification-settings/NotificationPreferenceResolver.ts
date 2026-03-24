import type {
  NotificationPreferences,
  NotificationCategoryId,
  NotificationChannelPrefs,
} from "./types"
import { NOTIFICATION_CATEGORY_IDS } from "./types"

const DEFAULT_CHANNEL: NotificationChannelPrefs = {
  enabled: true,
  inApp: true,
  email: true,
  sms: false,
}

/**
 * Returns default preferences (all categories enabled, in-app + email, no SMS).
 */
export function getDefaultNotificationPreferences(): NotificationPreferences {
  const categories: Partial<Record<NotificationCategoryId, NotificationChannelPrefs>> = {}
  for (const id of NOTIFICATION_CATEGORY_IDS) {
    categories[id] = { ...DEFAULT_CHANNEL }
  }
  return { globalEnabled: true, categories }
}

/**
 * Merges saved preferences with defaults; missing categories get defaults.
 */
export function resolveNotificationPreferences(
  saved: NotificationPreferences | null | undefined
): NotificationPreferences {
  const defaults = getDefaultNotificationPreferences()
  if (!saved?.categories) return defaults
  const categories = { ...defaults.categories }
  for (const id of NOTIFICATION_CATEGORY_IDS) {
    const s = saved.categories[id]
    if (s) {
      categories[id] = {
        enabled: s.enabled ?? defaults.categories?.[id]?.enabled ?? true,
        inApp: s.inApp ?? defaults.categories?.[id]?.inApp ?? true,
        email: s.email ?? defaults.categories?.[id]?.email ?? true,
        sms: s.sms ?? defaults.categories?.[id]?.sms ?? false,
      }
    }
  }
  return {
    globalEnabled: saved.globalEnabled ?? true,
    categories,
  }
}

/**
 * Stable fingerprint for comparing preference snapshots in the client.
 */
export function getNotificationPreferencesFingerprint(
  prefs: NotificationPreferences | null | undefined
): string {
  const resolved = resolveNotificationPreferences(prefs)
  const categories = NOTIFICATION_CATEGORY_IDS.map((id) => {
    const value = resolved.categories?.[id] ?? DEFAULT_CHANNEL
    return `${id}:${value.enabled ? "1" : "0"}${value.inApp ? "1" : "0"}${value.email ? "1" : "0"}${value.sms ? "1" : "0"}`
  })
  return `${resolved.globalEnabled !== false ? "1" : "0"}|${categories.join("|")}`
}

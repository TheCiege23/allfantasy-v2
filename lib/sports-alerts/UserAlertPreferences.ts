import { getSettingsProfile } from "@/lib/user-settings/SettingsQueryService"
import { updateUserProfile } from "@/lib/user-settings/UserProfileService"
import type { UserAlertPreferences } from "./types"
import type { NotificationPreferences, NotificationChannelPrefs } from "@/lib/notification-settings/types"

const CATEGORY_MAP: Record<keyof UserAlertPreferences, string> = {
  injuryAlerts: "injury_alerts",
  performanceAlerts: "performance_alerts",
  lineupAlerts: "lineup_alerts",
}

function toChannelPref(enabled: boolean): NotificationChannelPrefs {
  return { enabled, inApp: enabled, email: false, sms: false }
}

/**
 * Resolve sports alert preferences from user profile notification preferences.
 */
export async function getAlertPreferences(userId: string): Promise<UserAlertPreferences> {
  const profile = await getSettingsProfile(userId)
  const prefs = (profile as { notificationPreferences?: NotificationPreferences } | null)
    ?.notificationPreferences?.categories ?? {}

  return {
    injuryAlerts: prefs.injury_alerts?.inApp ?? true,
    performanceAlerts: prefs.performance_alerts?.inApp ?? true,
    lineupAlerts: prefs.lineup_alerts?.inApp ?? true,
  }
}

/**
 * Persist sports alert preferences into user profile (notificationPreferences).
 */
export async function setAlertPreferences(
  userId: string,
  preferences: Partial<UserAlertPreferences>
): Promise<{ ok: boolean; error?: string }> {
  const current = await getAlertPreferences(userId)
  const merged: UserAlertPreferences = {
    injuryAlerts: preferences.injuryAlerts ?? current.injuryAlerts,
    performanceAlerts: preferences.performanceAlerts ?? current.performanceAlerts,
    lineupAlerts: preferences.lineupAlerts ?? current.lineupAlerts,
  }

  const categories: Partial<Record<string, NotificationChannelPrefs>> = {}
  for (const key of Object.keys(merged) as (keyof UserAlertPreferences)[]) {
    const catId = CATEGORY_MAP[key]
    if (catId) {
      categories[catId] = toChannelPref(merged[key])
    }
  }

  const existing = await getSettingsProfile(userId)
  const existingPrefs = (existing as { notificationPreferences?: NotificationPreferences } | null)
    ?.notificationPreferences ?? {}
  const mergedCategories = { ...existingPrefs.categories, ...categories }

  return updateUserProfile(userId, {
    notificationPreferences: {
      ...existingPrefs,
      categories: mergedCategories,
    },
  })
}

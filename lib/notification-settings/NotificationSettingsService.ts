import type { NotificationPreferences } from "./types"

/**
 * Fetches notification preferences from profile (GET /api/user/profile).
 * Caller should merge with resolveNotificationPreferences for full shape.
 */
export async function getNotificationPreferencesFromProfile(): Promise<NotificationPreferences | null> {
  const res = await fetch("/api/user/profile", { cache: "no-store" })
  if (!res.ok) return null
  const data = await res.json().catch(() => ({}))
  const raw = data.notificationPreferences
  if (raw && typeof raw === "object") return raw as NotificationPreferences
  return null
}

/**
 * Saves notification preferences via PATCH /api/user/profile.
 */
export async function updateNotificationPreferences(
  prefs: NotificationPreferences
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/user/profile", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ notificationPreferences: prefs }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: data.error ?? "Failed to save" }
  return { ok: true }
}

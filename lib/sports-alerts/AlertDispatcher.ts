import { getAlertPreferences } from "./UserAlertPreferences"
import { createSportsAlert } from "./SportsAlertService"
import type { SportsAlertPayload, SportsAlertType } from "./types"

/**
 * Dispatches a sports alert to a list of users. Only sends to users who have
 * that alert type enabled in their preferences (in-app).
 */
export async function dispatchSportsAlert(
  payload: SportsAlertPayload,
  userIds: string[]
): Promise<{ sent: number; skipped: number }> {
  let sent = 0
  let skipped = 0

  for (const userId of userIds) {
    const prefs = await getAlertPreferences(userId)
    const key = payload.type === "injury_alert"
      ? "injuryAlerts"
      : payload.type === "performance_alert"
        ? "performanceAlerts"
        : "lineupAlerts"
    if (!prefs[key]) {
      skipped++
      continue
    }
    const ok = await createSportsAlert(userId, payload)
    if (ok) sent++
    else skipped++
  }

  return { sent, skipped }
}

/**
 * Resolve which alert type a notification type string is (for filtering).
 */
export function isSportsAlertType(type: string): type is SportsAlertType {
  return (
    type === "injury_alert" ||
    type === "performance_alert" ||
    type === "lineup_alert"
  )
}

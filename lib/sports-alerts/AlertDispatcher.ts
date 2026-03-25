import { getAlertPreferences } from "./UserAlertPreferences"
import { createSportsAlert } from "./SportsAlertService"
import type {
  DispatchSportsAlertResult,
  SportsAlertPayload,
  SportsAlertType,
} from "./types"

/**
 * Dispatches a sports alert to a list of users. Only sends to users who have
 * that alert type enabled in their preferences (in-app).
 */
export async function dispatchSportsAlert(
  payload: SportsAlertPayload,
  userIds: string[]
): Promise<DispatchSportsAlertResult> {
  const startedAtDate = new Date()
  const startedAt = startedAtDate.toISOString()
  let sent = 0
  let skipped = 0
  let failed = 0

  const key = payload.type === "injury_alert"
    ? "injuryAlerts"
    : payload.type === "performance_alert"
      ? "performanceAlerts"
      : "lineupAlerts"

  await Promise.all(
    userIds.map(async (userId) => {
      try {
        const prefs = await getAlertPreferences(userId)
        if (!prefs[key]) {
          skipped++
          return
        }
        const ok = await createSportsAlert(userId, payload)
        if (ok) sent++
        else failed++
      } catch {
        failed++
      }
    })
  )

  const completedAtDate = new Date()
  const completedAt = completedAtDate.toISOString()

  return {
    sent,
    skipped,
    failed,
    targetCount: userIds.length,
    startedAt,
    completedAt,
    durationMs: Math.max(0, completedAtDate.getTime() - startedAtDate.getTime()),
  }
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

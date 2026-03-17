/**
 * Real-time sports alerts — injury, performance, lineup.
 */

export type SportsAlertType = "injury_alert" | "performance_alert" | "lineup_alert"

export interface SportsAlertPayload {
  type: SportsAlertType
  title: string
  body: string
  /** Deep link: player page, league page, or legacy app. */
  actionHref: string
  actionLabel?: string
  leagueId?: string | null
  playerId?: string | null
  playerName?: string | null
  sport?: string | null
  severity?: "low" | "medium" | "high"
}

export interface UserAlertPreferences {
  injuryAlerts: boolean
  performanceAlerts: boolean
  lineupAlerts: boolean
}

export const SPORTS_ALERT_TYPES: SportsAlertType[] = [
  "injury_alert",
  "performance_alert",
  "lineup_alert",
]

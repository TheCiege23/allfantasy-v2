import { createPlatformNotification } from "@/lib/platform/notification-service"
import { getDeepLinkRedirect } from "@/lib/routing/DeepLinkHandler"
import type { SportsAlertPayload } from "./types"

function getValidTriggeredAt(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString()
}

/**
 * Creates a single sports alert as a platform notification.
 * Stores actionHref in meta so NotificationRouteResolver routes the click to the correct player or league page.
 */
export async function createSportsAlert(
  userId: string,
  payload: SportsAlertPayload
): Promise<boolean> {
  const href = getDeepLinkRedirect(payload.actionHref, "/dashboard")
  const dispatchedAt = new Date().toISOString()
  const triggeredAt = getValidTriggeredAt(payload.triggeredAt)
  const deliveryLatencyMs = triggeredAt
    ? Math.max(0, Date.parse(dispatchedAt) - Date.parse(triggeredAt))
    : undefined
  const meta: Record<string, unknown> = {
    actionHref: href,
    actionLabel: payload.actionLabel ?? "View",
    leagueId: payload.leagueId ?? undefined,
    playerId: payload.playerId ?? undefined,
    playerName: payload.playerName ?? undefined,
    sport: payload.sport ?? undefined,
    eventId: payload.eventId ?? undefined,
    triggeredAt: triggeredAt ?? undefined,
    dispatchedAt,
    deliveryLatencyMs,
  }
  return createPlatformNotification({
    userId,
    productType: "app",
    type: payload.type,
    title: payload.title,
    body: payload.body ?? undefined,
    severity: payload.severity ?? "medium",
    meta,
  })
}

/**
 * Build payload for an injury alert (e.g. from SportsNews or injury feed).
 */
export function buildInjuryAlert(params: {
  title: string
  body: string
  actionHref: string
  actionLabel?: string
  leagueId?: string | null
  playerId?: string | null
  playerName?: string | null
  sport?: string | null
}): SportsAlertPayload {
  return {
    type: "injury_alert",
    title: params.title,
    body: params.body,
    actionHref: params.actionHref,
    actionLabel: params.actionLabel,
    leagueId: params.leagueId,
    playerId: params.playerId,
    playerName: params.playerName,
    sport: params.sport,
    severity: "high",
  }
}

/**
 * Build payload for a performance alert.
 */
export function buildPerformanceAlert(params: {
  title: string
  body: string
  actionHref: string
  actionLabel?: string
  leagueId?: string | null
  playerId?: string | null
  playerName?: string | null
  sport?: string | null
}): SportsAlertPayload {
  return {
    type: "performance_alert",
    title: params.title,
    body: params.body,
    actionHref: params.actionHref,
    actionLabel: params.actionLabel,
    leagueId: params.leagueId,
    playerId: params.playerId,
    playerName: params.playerName,
    sport: params.sport,
    severity: "medium",
  }
}

/**
 * Build payload for a lineup alert.
 */
export function buildLineupAlert(params: {
  title: string
  body: string
  actionHref: string
  actionLabel?: string
  leagueId?: string | null
  playerId?: string | null
  playerName?: string | null
  sport?: string | null
}): SportsAlertPayload {
  return {
    type: "lineup_alert",
    title: params.title,
    body: params.body,
    actionHref: params.actionHref,
    actionLabel: params.actionLabel,
    leagueId: params.leagueId,
    playerId: params.playerId,
    playerName: params.playerName,
    sport: params.sport,
    severity: "medium",
  }
}

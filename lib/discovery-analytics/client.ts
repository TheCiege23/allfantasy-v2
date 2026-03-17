"use client"

import { DISCOVERY_EVENTS } from "./index"
import type { DiscoveryEventMeta, DiscoveryJoinClickMeta } from "./index"

function getSessionId(): string | null {
  try {
    const key = "af_session_id"
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const id = crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`
    localStorage.setItem(key, id)
    return id
  } catch {
    return null
  }
}

function post(event: string, meta: Record<string, unknown>): void {
  const sessionId = getSessionId()
  const payload = {
    event,
    sessionId,
    path: typeof window !== "undefined" ? window.location.pathname : null,
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
    meta: meta && typeof meta === "object" ? meta : null,
  }
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {})
}

/**
 * Track discovery league view (e.g. user opened league detail page).
 */
export function trackDiscoveryLeagueView(meta: DiscoveryEventMeta): void {
  post(DISCOVERY_EVENTS.LEAGUE_VIEW, {
    leagueId: meta.leagueId,
    source: meta.source,
    leagueName: meta.leagueName ?? null,
    sport: meta.sport ?? null,
  })
}

/**
 * Track discovery join click (user clicked Join on a league card or detail).
 */
export function trackDiscoveryJoinClick(meta: DiscoveryJoinClickMeta): void {
  post(DISCOVERY_EVENTS.JOIN_CLICK, {
    leagueId: meta.leagueId,
    source: meta.source,
    leagueName: meta.leagueName ?? null,
    sport: meta.sport ?? null,
    joinUrl: meta.joinUrl ?? null,
  })
}

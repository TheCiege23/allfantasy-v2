/**
 * Discovery analytics (PROMPT 228): league views, join clicks, orphan team adoption.
 * Events are stored via AnalyticsEvent (POST /api/analytics/track or server-side).
 */

import type { DiscoverySource } from "@/lib/public-discovery/types"

export const DISCOVERY_EVENTS = {
  LEAGUE_VIEW: "discovery_league_view",
  JOIN_CLICK: "discovery_join_click",
  ORPHAN_ADOPTION: "discovery_orphan_adoption",
} as const

export type { DiscoverySource } from "@/lib/public-discovery/types"

/** Meta for league view / join click (client). */
export interface DiscoveryEventMeta {
  leagueId: string
  source: DiscoverySource
  leagueName?: string | null
  sport?: string | null
}

/** Meta for join click (includes destination). */
export interface DiscoveryJoinClickMeta extends DiscoveryEventMeta {
  joinUrl?: string | null
}

/** Meta for orphan adoption (server). */
export interface DiscoveryOrphanAdoptionMeta {
  leagueId: string
  rosterId: string
  userId: string
}

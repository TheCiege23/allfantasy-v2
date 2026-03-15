/**
 * DashboardCardResolver — config for dashboard cards (product launchers, section cards).
 * Single source of truth for card id, title, href, product, and display order.
 */

export interface DashboardCardConfig {
  id: string
  title: string
  href: string
  product: "bracket" | "webapp" | "legacy"
  description: string
  highlight?: string
}

/** Product launcher cards shown at top of dashboard (Bracket, WebApp, Legacy). */
export const PRODUCT_LAUNCHER_CARDS: DashboardCardConfig[] = [
  {
    id: "bracket",
    title: "Bracket",
    href: "/brackets",
    product: "bracket",
    description: "Pools and bracket entries.",
    highlight: "AI highlight: undervalued upset spots.",
  },
  {
    id: "webapp",
    title: "WebApp",
    href: "/app/home",
    product: "webapp",
    description: "League management, roster, waivers, trades, and draft.",
    highlight: "AI highlight: waiver adds with immediate lineup impact.",
  },
  {
    id: "legacy",
    title: "Legacy",
    href: "/af-legacy",
    product: "legacy",
    description: "Team scan, draft war room, trade center.",
    highlight: "AI highlight: trade market and draft strategy.",
  },
]

/** Resolve product launcher cards (optionally with counts for bracket). */
export function getProductLauncherCards(opts?: {
  poolCount?: number
  entryCount?: number
}): DashboardCardConfig[] {
  return PRODUCT_LAUNCHER_CARDS.map((card) => ({ ...card }))
}

/** Section card types for dashboard layout. */
export type DashboardSectionCardType =
  | "welcome"
  | "product_launchers"
  | "alerts"
  | "active_leagues"
  | "bracket_entries"
  | "quick_actions"
  | "ai_activity"
  | "legacy_highlights"

export interface DashboardSectionConfig {
  id: DashboardSectionCardType
  title: string
  viewAllHref?: string
  visible: boolean
}

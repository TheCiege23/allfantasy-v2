/**
 * Phase 3B.2 — Pure grouping helper for dashboard intelligence cards.
 *
 * Maps `DashboardIntelligenceCard[]` into named UI groups while preserving
 * relative input order within each group. Never throws. Pure.
 *
 * Designed to be composed with `sortDashboardIntelligenceCards` so callers
 * pass already-sorted cards in and get grouped + sort-stable output back.
 */

import type { DashboardIntelligenceCard } from "./contracts"

export type IntelligenceGroupId =
  | "risks"
  | "coaching"
  | "matchup"
  | "playoffs"
  | "opportunities"
  | "other"

export type IntelligenceGroup = {
  id: IntelligenceGroupId
  title: string
  cards: DashboardIntelligenceCard[]
}

const GROUP_ORDER: ReadonlyArray<{ id: IntelligenceGroupId; title: string }> = [
  { id: "risks", title: "Risks" },
  { id: "coaching", title: "Coaching" },
  { id: "matchup", title: "Matchup" },
  { id: "playoffs", title: "Playoffs" },
  { id: "opportunities", title: "Opportunities" },
  { id: "other", title: "Other" },
]

export function groupForCardId(
  cardId: DashboardIntelligenceCard["id"] | string
): IntelligenceGroupId {
  switch (cardId) {
    case "top_risks":
      return "risks"
    case "coaching":
      return "coaching"
    case "urgency":
      return "matchup"
    case "playoff_outlook":
      return "playoffs"
    case "roster_outlook":
    case "team_identity":
    case "competitive_context":
      return "opportunities"
    default:
      return "other"
  }
}

/**
 * Group cards into the standard intelligence groups. Returns groups in the
 * canonical UI order, omitting any group with zero cards. Card order within
 * each group is preserved from the input array (callers should sort first).
 */
export function groupIntelligenceCards(
  cards: ReadonlyArray<DashboardIntelligenceCard> | null | undefined
): IntelligenceGroup[] {
  if (!Array.isArray(cards) || cards.length === 0) return []
  const buckets = new Map<IntelligenceGroupId, DashboardIntelligenceCard[]>()
  for (const card of cards) {
    const gid = groupForCardId(card.id)
    const existing = buckets.get(gid)
    if (existing) {
      existing.push(card)
    } else {
      buckets.set(gid, [card])
    }
  }
  const out: IntelligenceGroup[] = []
  for (const meta of GROUP_ORDER) {
    const list = buckets.get(meta.id)
    if (list && list.length > 0) {
      out.push({ id: meta.id, title: meta.title, cards: list })
    }
  }
  return out
}

/**
 * Phase 3B — Adaptive ordering for dashboard intelligence cards.
 *
 * Pure, deterministic sorter that ranks a `DashboardIntelligenceCard[]` by
 * urgency, strategic risk, recommendation severity, and outlook constants.
 *
 * Contract:
 *  - Never throws.
 *  - Stable: equal-weighted cards keep their input order.
 *  - Tolerates `null` / `undefined` intelligence input.
 *  - Unknown card ids receive weight 0 and preserve insertion order.
 */

import type { IntelligenceContextSlice } from "@/lib/chimmy-context/types"
import type {
  DashboardIntelligenceCard,
  DashboardSeverity,
} from "./contracts"

type IntelligenceLike = Pick<
  IntelligenceContextSlice,
  "urgencyLevel" | "recommendationSeverity" | "strategicRiskScores"
> | null | undefined

function urgencyWeight(level: IntelligenceContextSlice["urgencyLevel"] | undefined): number {
  switch (level) {
    case "critical":
      return 100
    case "high":
      return 80
    case "moderate":
      return 60
    case "low":
      return 40
    default:
      return 0
  }
}

function severityWeight(
  severity: DashboardSeverity | IntelligenceContextSlice["recommendationSeverity"] | undefined
): number {
  switch (severity) {
    case "critical":
      return 90
    case "high":
      return 70
    case "moderate":
      return 50
    case "low":
      return 30
    default:
      return 0
  }
}

function clampRiskComposite(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

export function weightForCard(
  card: DashboardIntelligenceCard,
  intelligence: IntelligenceLike
): number {
  switch (card.id) {
    case "urgency":
      return urgencyWeight(intelligence?.urgencyLevel)
    case "top_risks":
      return clampRiskComposite(intelligence?.strategicRiskScores?.composite)
    case "coaching":
      return severityWeight(intelligence?.recommendationSeverity)
    case "playoff_outlook":
      return 35
    case "roster_outlook":
      return 25
    case "team_identity":
      return 20
    case "competitive_context":
      return 15
    default:
      return 0
  }
}

/**
 * Sort dashboard intelligence cards by adaptive weight (descending). Stable —
 * ties preserve insertion order. Pure; safe to call on every render.
 */
export function sortDashboardIntelligenceCards(
  cards: ReadonlyArray<DashboardIntelligenceCard> | null | undefined,
  intelligence: IntelligenceLike
): DashboardIntelligenceCard[] {
  if (!Array.isArray(cards) || cards.length === 0) return []
  const decorated = cards.map((card, index) => ({
    card,
    index,
    weight: weightForCard(card, intelligence),
  }))
  decorated.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight
    return a.index - b.index
  })
  return decorated.map((d) => d.card)
}

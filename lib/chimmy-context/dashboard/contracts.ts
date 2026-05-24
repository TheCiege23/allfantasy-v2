/**
 * Phase 3A.2 — Dashboard-safe Chimmy intelligence contracts.
 *
 * Typed, UI-agnostic shapes for surfacing the IntelligenceContextSlice on
 * dashboards / cards / drawers without leaking the engine's internal types.
 *
 * Pure mappers only. No I/O, no Prisma, no fetch, no env reads, no DOM.
 * Every helper is defensive: never throws, always returns an array (possibly
 * empty), tolerates `undefined` / `null` upstream fields.
 */

import type { IntelligenceContextSlice } from "@/lib/chimmy-context/types"

/** Stable severity vocabulary used by dashboard renderers. */
export type DashboardSeverity = "critical" | "high" | "moderate" | "low" | "info"

export type TopRisk = {
  dimension:
    | "roster"
    | "injury"
    | "volatility"
    | "playoff"
    | "matchup"
    | "structural"
  /** 0-100 risk score. */
  score: number
  /** Human-readable signal strings (already short). */
  signals: string[]
}

export type TopOpportunity = {
  /** Stable slug, e.g. `"trade_for_wr_depth"`. */
  slug: string
  /** Numeric score 0-100. */
  score: number
  /** Optional short rationale lines for tooltip / drawer body. */
  rationale: string[]
}

export type CoachingInsight = {
  slug: string
  theme:
    | "stance"
    | "injury"
    | "schedule"
    | "roster"
    | "playoff"
    | "matchup"
    | "unknown"
  score: number
  rationale: string[]
}

/** Single dashboard card representing a slice of Chimmy intelligence. */
export type DashboardIntelligenceCard = {
  /** Stable card id. */
  id:
    | "urgency"
    | "team_identity"
    | "top_risks"
    | "coaching"
    | "playoff_outlook"
    | "roster_outlook"
    | "competitive_context"
  title: string
  severity: DashboardSeverity
  /** Short headline / metric value. May be null when no data. */
  headline: string | null
  /** Optional supplemental bullet lines (always an array). */
  bullets: string[]
  /** Optional action button label shown on the card. */
  ctaLabel?: string
  /** Optional action button href shown on the card. */
  ctaHref?: string
}

function mapUrgencyToSeverity(
  level: IntelligenceContextSlice["urgencyLevel"]
): DashboardSeverity {
  switch (level) {
    case "critical":
      return "critical"
    case "high":
      return "high"
    case "moderate":
      return "moderate"
    case "low":
      return "low"
    default:
      return "info"
  }
}

function mapRiskScoreToSeverity(score: number): DashboardSeverity {
  if (score >= 80) return "critical"
  if (score >= 60) return "high"
  if (score >= 40) return "moderate"
  if (score > 0) return "low"
  return "info"
}

/**
 * Build the top-risks list for the dashboard. Returns at most `limit` items
 * (default 3). Dimensions with `score <= 0` are dropped. Never throws.
 */
export function buildTopRisksFromIntelligence(
  slice: IntelligenceContextSlice | null | undefined,
  limit = 3
): TopRisk[] {
  if (!slice) return []
  const scores = slice.strategicRiskScores
  const top = Array.isArray(slice.topRisks) ? slice.topRisks : []
  if (top.length === 0 || !scores) return []
  return top.slice(0, Math.max(0, limit)).map((r) => ({
    dimension: r.dimension,
    score: r.score,
    signals: Array.isArray(scores.signals?.[r.dimension])
      ? scores.signals[r.dimension].slice(0, 3)
      : [],
  }))
}

/** Coaching insights, preferring adaptive hints when available. */
export function buildCoachingInsightsFromIntelligence(
  slice: IntelligenceContextSlice | null | undefined,
  limit = 3
): CoachingInsight[] {
  if (!slice) return []
  const adaptive = Array.isArray(slice.adaptiveCoachingHints)
    ? slice.adaptiveCoachingHints
    : []
  if (adaptive.length > 0) {
    return adaptive.slice(0, Math.max(0, limit)).map((h) => ({
      slug: h.slug,
      theme: h.theme,
      score: h.score,
      rationale: Array.isArray(h.rationale) ? h.rationale.slice(0, 3) : [],
    }))
  }
  // Fallback to legacy untyped slugs at neutral score.
  const raw = Array.isArray(slice.coachingHints) ? slice.coachingHints : []
  return raw.slice(0, Math.max(0, limit)).map((slug) => ({
    slug,
    theme: "unknown",
    score: 0,
    rationale: [],
  }))
}

/**
 * Compose the full set of dashboard cards. Always returns an array.
 * Cards with no underlying data are omitted (not returned as nulls).
 */
export function buildDashboardIntelligenceCards(
  slice: IntelligenceContextSlice | null | undefined
): DashboardIntelligenceCard[] {
  if (!slice) return []
  const cards: DashboardIntelligenceCard[] = []

  // Urgency
  cards.push({
    id: "urgency",
    title: "Urgency",
    severity: mapUrgencyToSeverity(slice.urgencyLevel),
    headline:
      slice.urgencyLevel === "unknown"
        ? null
        : `${slice.urgencyLevel}${
            typeof slice.urgencyScore === "number" ? ` (${slice.urgencyScore})` : ""
          }`,
    bullets: [],
  })

  // Team identity
  if (slice.teamIdentity && slice.teamIdentity !== "unknown") {
    cards.push({
      id: "team_identity",
      title: "Team Identity",
      severity: "info",
      headline: slice.teamIdentity.replace(/_/g, " "),
      bullets: [],
    })
  }

  // Top risks (only when we have any)
  const risks = buildTopRisksFromIntelligence(slice)
  if (risks.length > 0) {
    const topScore = risks[0]?.score ?? 0
    cards.push({
      id: "top_risks",
      title: "Top Risks",
      severity: mapRiskScoreToSeverity(topScore),
      headline: risks
        .map((r) => `${r.dimension}:${r.score}`)
        .join(", "),
      bullets: risks.flatMap((r) =>
        r.signals.length > 0 ? [`${r.dimension} — ${r.signals.join("; ")}`] : []
      ),
    })
  }

  // Coaching
  const insights = buildCoachingInsightsFromIntelligence(slice)
  if (insights.length > 0) {
    cards.push({
      id: "coaching",
      title: "Coaching",
      severity: "info",
      headline: insights
        .map((i) =>
          i.score > 0 ? `${i.slug}(${i.score})` : i.slug
        )
        .join(", "),
      bullets: insights.flatMap((i) =>
        i.rationale.length > 0 ? [`${i.slug} — ${i.rationale.join("; ")}`] : []
      ),
    })
  }

  // Outlooks
  if (slice.playoffOutlook) {
    cards.push({
      id: "playoff_outlook",
      title: "Playoff Outlook",
      severity: "info",
      headline: slice.playoffOutlook,
      bullets: [],
    })
  }
  if (slice.rosterOutlook) {
    cards.push({
      id: "roster_outlook",
      title: "Roster Outlook",
      severity: "info",
      headline: slice.rosterOutlook,
      bullets: [],
    })
  }
  if (slice.competitiveContextSummary) {
    cards.push({
      id: "competitive_context",
      title: "Competitive Context",
      severity: "info",
      headline: slice.competitiveContextSummary,
      bullets: [],
    })
  }

  return cards
}

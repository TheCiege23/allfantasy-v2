/**
 * Phase 2C Batch 4 Sub-batch F (slice 2) — Adaptive Coaching Hint Scoring.
 *
 * Pure helper that takes the raw coaching-hint slugs emitted by
 * `COACHING_RULES` (in `intelligenceBundle.ts`) and reshapes them into an
 * adaptive, prioritized list driven by the existing strategic risk scores,
 * urgency level, team identity, and volatility.
 *
 * Behavior:
 *   - Each hint receives a relevance score (base + context bonuses).
 *   - Same-theme hints collapse to the highest scorer.
 *   - Hints below `relevanceFloor` move into `suppressed[]` (debug surface).
 *   - Active hints are sorted desc by score, capped at `maxHints`.
 *   - Never throws; on internal failure returns the input slugs unchanged
 *     (themed as `"unknown"`, score = base only) so downstream callers
 *     keep working.
 *
 * Constraints (preserved):
 *   - No I/O, no DB, no new providers.
 *   - All weights / floors live in `COACHING_ADAPTATION_TUNABLES`.
 *   - Pure. No mutation of inputs.
 *
 * Not wired into `intelligenceBundle.ts` or PromptComposer in this slice.
 * Sub-batch F slice 3 routes the result into `IntelligenceContextSlice`.
 */

import type { StrategicRiskScores } from "@/lib/chimmy-context/intel/strategicRisk"
import type { IntelligenceContextSlice } from "@/lib/chimmy-context/types"

export type CoachingHintTheme =
  | "stance"
  | "injury"
  | "schedule"
  | "roster"
  | "playoff"
  | "matchup"
  | "unknown"

export type AdaptedCoachingHint = {
  slug: string
  theme: CoachingHintTheme
  /** 0-100 relevance score derived from base + context bonuses. */
  score: number
  /** Factual contribution tags (debug + future UI). */
  rationale: string[]
}

export type AdaptCoachingInput = {
  /** Raw slugs as emitted by `COACHING_RULES` (order does not matter). */
  hints: string[]
  /** Strategic risk scores from `computeStrategicRisks`. */
  riskScores: StrategicRiskScores | null
  urgencyLevel: IntelligenceContextSlice["urgencyLevel"]
  identity: IntelligenceContextSlice["teamIdentity"]
  /** Optional roster volatility (std dev) when known. */
  volatility?: number | null
  /** Reserved for slice 3 — opponent-strength rating + tier. */
  opponentStrengthRating?: string | null
}

export type AdaptCoachingOutput = {
  hints: AdaptedCoachingHint[]
  suppressed: AdaptedCoachingHint[]
}

/** Stable hint → theme map. New `COACHING_RULES` slugs default to `"unknown"`. */
export const COACHING_HINT_THEMES: Record<string, CoachingHintTheme> = {
  contender_attack_now: "stance",
  rebuild_target_future: "stance",
  depth_heavy_consolidate: "stance",
  boom_bust_hedge: "stance",
  manage_injuries: "injury",
  monitor_byes: "schedule",
  address_position_depth: "roster",
  playoff_lock_protect: "playoff",
  tight_matchup_leverage: "matchup",
}

/**
 * All weights / floors live here so future tuning is one edit. Values are
 * intentionally first-pass — NOT final formulas.
 */
export const COACHING_ADAPTATION_TUNABLES = {
  /** Base relevance score per hint before context bonuses. */
  baseWeights: {
    contender_attack_now: 30,
    rebuild_target_future: 20,
    depth_heavy_consolidate: 20,
    boom_bust_hedge: 20,
    manage_injuries: 30,
    monitor_byes: 20,
    address_position_depth: 25,
    playoff_lock_protect: 30,
    tight_matchup_leverage: 25,
  } as Record<string, number>,
  /** Default base weight for slugs not listed above. */
  defaultBaseWeight: 15,
  /** Risk-dimension multipliers (per 1.0 of dimension score). */
  riskBonuses: {
    manage_injuries: { injury: 0.6 },
    address_position_depth: { roster: 0.4, structural: 0.3 },
    playoff_lock_protect: { playoff: 0.5 },
    tight_matchup_leverage: { matchup: 0.5 },
    boom_bust_hedge: { volatility: 0.5 },
    contender_attack_now: { playoff: 0.3, matchup: 0.2 },
    depth_heavy_consolidate: { structural: 0.3 },
  } as Record<string, Partial<Record<keyof StrategicRiskScores, number>>>,
  /** Flat bonus by urgency level (added to any hint). */
  urgencyBonus: {
    critical: 15,
    high: 10,
    moderate: 5,
    low: 0,
    none: 0,
    unknown: 0,
  } as Record<string, number>,
  /** Per-identity relevance floor; hints scoring below move to suppressed. */
  relevanceFloorByIdentity: {
    contender: 25,
    rebuild: 20,
    boom_bust: 25,
    depth_heavy: 25,
    injury_prone: 20,
    youth_focused: 20,
    unknown: 20,
  } as Record<string, number>,
  defaultRelevanceFloor: 20,
  /** Identity ↔ hint compatibility multiplier (e.g. rebuild_target_future on
   * a contender becomes very weak). 1.0 = no change. */
  identityCompatibility: {
    contender_attack_now: { contender: 1.25, rebuild: 0.4 },
    rebuild_target_future: { rebuild: 1.25, contender: 0.4 },
    depth_heavy_consolidate: { depth_heavy: 1.25 },
    boom_bust_hedge: { boom_bust: 1.25 },
    playoff_lock_protect: { contender: 1.2 },
  } as Record<string, Partial<Record<string, number>>>,
  /** Volatility threshold above which boom_bust_hedge gets a flat bonus. */
  volatilityHintBonus: { threshold: 25, amount: 10 },
  /** Max active hints returned. */
  maxHints: 6,
} as const

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo
  return Math.min(hi, Math.max(lo, n))
}

function themeOf(slug: string): CoachingHintTheme {
  return COACHING_HINT_THEMES[slug] ?? "unknown"
}

function scoreHint(
  slug: string,
  input: AdaptCoachingInput
): AdaptedCoachingHint {
  const T = COACHING_ADAPTATION_TUNABLES
  const rationale: string[] = []

  const base = T.baseWeights[slug] ?? T.defaultBaseWeight
  rationale.push(`base:${base}`)

  let score = base

  // Urgency bonus (flat per level)
  const urgencyAdd = T.urgencyBonus[input.urgencyLevel] ?? 0
  if (urgencyAdd !== 0) {
    score += urgencyAdd
    rationale.push(`urgency:${input.urgencyLevel}+${urgencyAdd}`)
  }

  // Risk-driven bonuses
  if (input.riskScores) {
    const map = T.riskBonuses[slug]
    if (map) {
      for (const [dim, mult] of Object.entries(map) as Array<
        [keyof StrategicRiskScores, number]
      >) {
        const raw = input.riskScores[dim]
        if (typeof raw === "number" && raw > 0 && mult > 0) {
          const add = Math.round(raw * mult)
          if (add > 0) {
            score += add
            rationale.push(`risk:${String(dim)}*${mult}=${add}`)
          }
        }
      }
    }
  }

  // Identity compatibility multiplier
  const compatRow = T.identityCompatibility[slug]
  if (compatRow && input.identity in compatRow) {
    const mult = compatRow[input.identity]
    if (typeof mult === "number" && mult !== 1) {
      const before = score
      score = Math.round(score * mult)
      rationale.push(`identity:${input.identity}*${mult}=${score - before}`)
    }
  }

  // Volatility hint bonus (boom_bust_hedge only)
  if (
    slug === "boom_bust_hedge" &&
    input.volatility != null &&
    Number.isFinite(input.volatility) &&
    input.volatility >= T.volatilityHintBonus.threshold
  ) {
    score += T.volatilityHintBonus.amount
    rationale.push(`volatility:+${T.volatilityHintBonus.amount}`)
  }

  return {
    slug,
    theme: themeOf(slug),
    score: clamp(Math.round(score), 0, 100),
    rationale,
  }
}

/**
 * Score, theme-collapse, suppress, sort and cap an array of coaching hints.
 * Never throws — returns a best-effort fallback on internal failure.
 */
export function adaptCoachingHints(
  input: AdaptCoachingInput
): AdaptCoachingOutput {
  try {
    const rawSlugs = Array.isArray(input.hints) ? input.hints : []
    if (rawSlugs.length === 0) return { hints: [], suppressed: [] }

    // De-duplicate raw slugs first (preserve first occurrence).
    const seen = new Set<string>()
    const slugs: string[] = []
    for (const slug of rawSlugs) {
      if (typeof slug !== "string" || slug.length === 0) continue
      if (seen.has(slug)) continue
      seen.add(slug)
      slugs.push(slug)
    }

    const scored = slugs.map((slug) => scoreHint(slug, input))

    // Theme collapse — keep highest-scoring per non-"unknown" theme.
    const bestPerTheme = new Map<CoachingHintTheme, AdaptedCoachingHint>()
    const themeCollapsed: AdaptedCoachingHint[] = []
    const keepUnique: AdaptedCoachingHint[] = []
    for (const hint of scored) {
      if (hint.theme === "unknown") {
        keepUnique.push(hint)
        continue
      }
      const prev = bestPerTheme.get(hint.theme)
      if (!prev) {
        bestPerTheme.set(hint.theme, hint)
        continue
      }
      if (hint.score > prev.score) {
        themeCollapsed.push({ ...prev, rationale: [...prev.rationale, "theme_collapsed"] })
        bestPerTheme.set(hint.theme, hint)
      } else {
        themeCollapsed.push({ ...hint, rationale: [...hint.rationale, "theme_collapsed"] })
      }
    }

    const collapsed = [...bestPerTheme.values(), ...keepUnique]

    // Floor suppression by identity.
    const T = COACHING_ADAPTATION_TUNABLES
    const floor =
      T.relevanceFloorByIdentity[input.identity] ?? T.defaultRelevanceFloor
    const active: AdaptedCoachingHint[] = []
    const belowFloor: AdaptedCoachingHint[] = []
    for (const hint of collapsed) {
      if (hint.score < floor) belowFloor.push(hint)
      else active.push(hint)
    }

    // Sort desc by score; ties broken by slug for determinism.
    active.sort((a, b) =>
      b.score === a.score ? a.slug.localeCompare(b.slug) : b.score - a.score
    )

    const capped = active.slice(0, T.maxHints)
    const overflow = active.slice(T.maxHints).map((h) => ({
      ...h,
      rationale: [...h.rationale, "overflow"],
    }))

    return {
      hints: capped,
      suppressed: [...themeCollapsed, ...belowFloor, ...overflow],
    }
  } catch {
    const fallback = (Array.isArray(input.hints) ? input.hints : []).map(
      (slug) => ({
        slug,
        theme: "unknown" as CoachingHintTheme,
        score: COACHING_ADAPTATION_TUNABLES.defaultBaseWeight,
        rationale: ["fallback"],
      })
    )
    return { hints: fallback, suppressed: [] }
  }
}

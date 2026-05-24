/**
 * Phase 2C Batch 4 Sub-batch E — Unified Intelligence Layer.
 *
 * Pure synthesizer. Given an already-built `ChimmyContextBundle`, derive a
 * single `IntelligenceContextSlice` summarizing strategic posture (urgency,
 * identity, risks, coaching hints, competitive context).
 *
 * - No I/O, no DB, no new providers (provider separation preserved).
 * - All thresholds + rules live in tunable constants below.
 * - NEVER throws: wrapped in try/catch returning a safe empty slice.
 */

import { buildCompetitiveContext } from "@/lib/chimmy-context/intel/competitiveContext"
import {
  computeStrategicRisks,
  rankRiskDimensions,
} from "@/lib/chimmy-context/intel/strategicRisk"
import { adaptCoachingHints } from "@/lib/chimmy-context/intel/coachingAdaptation"
import type {
  ChimmyContextBundle,
  IntelligenceContextSlice,
  RecommendationSeverity,
} from "@/lib/chimmy-context/types"

/**
 * Tunable mapping from urgency level → recommendation severity. First-pass
 * surface; will swap to `recommendationPriority`-driven once that formula
 * lands in a later sub-batch.
 */
export const SEVERITY_TUNABLES = {
  urgencyLevelToSeverity: {
    critical: "CRITICAL",
    high: "HIGH",
    moderate: "MODERATE",
    low: "LOW",
    none: "WATCHLIST",
    unknown: "WATCHLIST",
  } as const satisfies Record<string, RecommendationSeverity>,
  /** Risk tags promoted into the strategicRisks list. */
  riskSignalAllowlist: new Set<string>([
    "injury_exposure",
    "bye_conflict",
    "volatility_high",
    "shallow_depth",
    "weak_position",
    "projection_imbalance",
  ]),
} as const

/**
 * Coaching hint rule registry. Each rule emits a stable slug (not a
 * sentence) — the prompt layer + UI can localize / rephrase later.
 * Predicates accept the synthesizer scratchpad (see `buildIntelligenceBundle`).
 */
type Scratch = {
  urgencyLevel: IntelligenceContextSlice["urgencyLevel"]
  urgencySignals: string[]
  identity: IntelligenceContextSlice["teamIdentity"]
  weaknessSignals: string[]
  strengthSignals: string[]
  standingsRank: number | null
  standingsTotal: number | null
  projectedMargin: number | null
  weeksUntilPlayoffs: number | null
}

export const COACHING_RULES: Array<{
  slug: string
  when: (s: Scratch) => boolean
}> = [
  {
    slug: "contender_attack_now",
    when: (s) =>
      s.identity === "contender" &&
      (s.urgencyLevel === "high" || s.urgencyLevel === "critical"),
  },
  {
    slug: "rebuild_target_future",
    when: (s) => s.identity === "rebuild",
  },
  {
    slug: "depth_heavy_consolidate",
    when: (s) => s.identity === "depth_heavy",
  },
  {
    slug: "manage_injuries",
    when: (s) =>
      s.urgencySignals.includes("injury_pressure") ||
      s.weaknessSignals.includes("injury_exposure"),
  },
  {
    slug: "monitor_byes",
    when: (s) =>
      s.urgencySignals.includes("bye_conflict") ||
      s.weaknessSignals.some((sig) => sig.startsWith("bye_conflict:")),
  },
  {
    slug: "address_position_depth",
    when: (s) =>
      s.weaknessSignals.some((sig) => sig.startsWith("shallow_depth:")) ||
      s.weaknessSignals.some((sig) => sig.startsWith("weak_position:")),
  },
  {
    slug: "playoff_lock_protect",
    when: (s) =>
      s.urgencySignals.includes("clinched") ||
      (s.weeksUntilPlayoffs != null &&
        s.weeksUntilPlayoffs <= 1 &&
        s.identity === "contender"),
  },
  {
    slug: "tight_matchup_leverage",
    when: (s) =>
      s.projectedMargin != null && Math.abs(s.projectedMargin) <= 3,
  },
  {
    slug: "boom_bust_hedge",
    when: (s) => s.identity === "boom_bust",
  },
]

const EMPTY: IntelligenceContextSlice = {
  urgencyLevel: "unknown",
  urgencyScore: null,
  recommendationPriority: "unknown",
  recommendationSeverity: "WATCHLIST",
  teamIdentity: "unknown",
  strategicRisks: [],
  coachingHints: [],
  playoffOutlook: null,
  rosterOutlook: null,
  competitiveContextSummary: null,
  strategicRiskScores: null,
  topRisks: [],
  adaptiveCoachingHints: [],
}

/** Cap on `topRisks` length surfaced into the slice. */
const TOP_RISKS_LIMIT = 3

function deriveRisks(weaknessSignals: string[], urgencySignals: string[]): string[] {
  const out = new Set<string>()
  const allow = SEVERITY_TUNABLES.riskSignalAllowlist
  for (const sig of weaknessSignals) {
    const head = sig.split(":")[0]!
    if (allow.has(head)) out.add(sig)
  }
  for (const sig of urgencySignals) {
    if (sig === "injury_pressure" || sig === "bye_conflict") out.add(sig)
  }
  return Array.from(out).slice(0, 6)
}

function derivePlayoffOutlook(
  weeksUntilPlayoffs: number | null,
  isPlayoffWeek: boolean | null,
  isEliminated: boolean | null,
  hasClinched: boolean | null,
  rank: number | null,
  total: number | null
): string | null {
  if (
    weeksUntilPlayoffs == null &&
    isPlayoffWeek !== true &&
    isEliminated == null &&
    hasClinched == null &&
    rank == null
  ) {
    return null
  }
  const parts: string[] = []
  if (isPlayoffWeek === true) parts.push("playoff week")
  else if (weeksUntilPlayoffs != null) parts.push(`wks_to_playoffs=${weeksUntilPlayoffs}`)
  if (hasClinched === true) parts.push("clinched")
  if (isEliminated === true) parts.push("eliminated")
  if (rank != null) parts.push(total != null ? `rank=${rank}/${total}` : `rank=${rank}`)
  return parts.length ? parts.join(" • ") : null
}

function deriveRosterOutlook(
  identity: IntelligenceContextSlice["teamIdentity"],
  starterProjectedTotal: number | null,
  weaknessCount: number,
  strengthCount: number
): string | null {
  if (
    identity === "unknown" &&
    starterProjectedTotal == null &&
    weaknessCount === 0 &&
    strengthCount === 0
  ) {
    return null
  }
  const parts: string[] = []
  if (identity !== "unknown") parts.push(`identity=${identity}`)
  if (starterProjectedTotal != null) parts.push(`proj=${starterProjectedTotal}`)
  if (strengthCount > 0) parts.push(`strengths=${strengthCount}`)
  if (weaknessCount > 0) parts.push(`weaknesses=${weaknessCount}`)
  return parts.length ? parts.join(" • ") : null
}

function deriveCompetitiveSummary(bundle: ChimmyContextBundle): string | null {
  const diffRaw = bundle.leagueDifficulty?.rating as
    | { score?: number; tier?: string; opponentStrength?: number }
    | null
    | undefined
  const standingsRows = bundle.standings?.rows ?? []
  const selfRow = standingsRows.find(
    (r) => r.teamId === bundle.matchup?.yourTeamId
  )
  const rank = selfRow?.rank ?? null
  const total = standingsRows.length || null

  const competitive = buildCompetitiveContext({
    leagueDifficultyScore:
      typeof diffRaw?.score === "number" ? diffRaw.score : null,
    userSkillScore: null,
    opponentQualityScore:
      typeof diffRaw?.opponentStrength === "number"
        ? diffRaw.opponentStrength
        : null,
    standingsPressureScore: null,
    leagueFormat: "unknown",
    scoringComplexityScore: null,
    sport: bundle.activeLeague?.sport ?? null,
  })
  void competitive // weights remain null per scaffold; reserved for future use

  const parts: string[] = []
  if (typeof diffRaw?.score === "number") parts.push(`diff=${diffRaw.score}`)
  if (typeof diffRaw?.tier === "string") parts.push(`tier=${diffRaw.tier}`)
  if (rank != null) parts.push(total ? `rank=${rank}/${total}` : `rank=${rank}`)
  return parts.length ? parts.join(" • ") : null
}

/**
 * Synthesize the unified intelligence slice from an already-built bundle.
 * Never throws — returns `EMPTY` on any internal error.
 */
export function buildIntelligenceBundle(
  bundle: ChimmyContextBundle
): IntelligenceContextSlice {
  try {
    const m = bundle.matchup
    const r = bundle.roster
    const standings = bundle.standings?.rows ?? []
    const selfRow = standings.find((row) => row.teamId === m?.yourTeamId) ?? null

    const urgencyLevel = (m?.urgencyLevel ?? "unknown") as IntelligenceContextSlice["urgencyLevel"]
    const urgencyScore = m?.urgencyScore ?? null
    const urgencySignals = m?.urgencySignals ?? []
    const identity = (r?.teamIdentityHint ?? "unknown") as IntelligenceContextSlice["teamIdentity"]
    const weaknessSignals = r?.weaknessSignals ?? []
    const strengthSignals = r?.strengthSignals ?? []

    const recommendationPriority =
      (m?.recommendationPriority ??
        "unknown") as IntelligenceContextSlice["recommendationPriority"]
    const recommendationSeverity: RecommendationSeverity =
      SEVERITY_TUNABLES.urgencyLevelToSeverity[urgencyLevel] ?? "WATCHLIST"

    const scratch: Scratch = {
      urgencyLevel,
      urgencySignals,
      identity,
      weaknessSignals,
      strengthSignals,
      standingsRank: selfRow?.rank ?? null,
      standingsTotal: standings.length || null,
      projectedMargin: m?.projectedMargin ?? null,
      weeksUntilPlayoffs: m?.weeksUntilPlayoffs ?? null,
    }

    const coachingHints: string[] = []
    for (const rule of COACHING_RULES) {
      try {
        if (rule.when(scratch)) coachingHints.push(rule.slug)
      } catch {
        // Skip individual rule failures — preserve fail-safe behavior.
      }
    }

    const strategicRisks = deriveRisks(weaknessSignals, urgencySignals)

    const playoffOutlook = derivePlayoffOutlook(
      m?.weeksUntilPlayoffs ?? null,
      m?.isPlayoffWeek ?? null,
      null,
      null,
      scratch.standingsRank,
      scratch.standingsTotal
    )

    const rosterOutlook = deriveRosterOutlook(
      identity,
      r?.starterProjectedTotal ?? null,
      weaknessSignals.length,
      strengthSignals.length
    )

    const competitiveContextSummary = deriveCompetitiveSummary(bundle)

    // ─── Phase 3A.1: adaptive surface ───────────────────────────────────────
    // Each step is wrapped so a synthesizer failure cannot break the slice.
    let strategicRiskScores: IntelligenceContextSlice["strategicRiskScores"] = null
    let topRisks: IntelligenceContextSlice["topRisks"] = []
    try {
      const scores = computeStrategicRisks(bundle)
      strategicRiskScores = scores
      topRisks = rankRiskDimensions(scores)
        .filter((d) => d.score > 0)
        .slice(0, TOP_RISKS_LIMIT)
    } catch {
      strategicRiskScores = null
      topRisks = []
    }

    let adaptiveCoachingHints: IntelligenceContextSlice["adaptiveCoachingHints"] = []
    try {
      const adapted = adaptCoachingHints({
        hints: coachingHints,
        riskScores: strategicRiskScores,
        urgencyLevel,
        identity,
        // RosterContextSlice has no volatility field today; reserved for slice 3+.
        volatility: null,
        opponentStrengthRating: null,
      })
      adaptiveCoachingHints = adapted.hints
    } catch {
      adaptiveCoachingHints = []
    }

    return {
      urgencyLevel,
      urgencyScore,
      recommendationPriority,
      recommendationSeverity,
      teamIdentity: identity,
      strategicRisks,
      coachingHints: coachingHints.slice(0, 6),
      playoffOutlook,
      rosterOutlook,
      competitiveContextSummary,
      strategicRiskScores,
      topRisks,
      adaptiveCoachingHints,
    }
  } catch {
    return { ...EMPTY, topRisks: [], adaptiveCoachingHints: [] }
  }
}

/** Convenience: true when the slice has zero actionable signal. */
export function isEmptyIntelligence(s: IntelligenceContextSlice): boolean {
  return (
    s.urgencyLevel === "unknown" &&
    s.teamIdentity === "unknown" &&
    s.strategicRisks.length === 0 &&
    s.coachingHints.length === 0 &&
    s.playoffOutlook == null &&
    s.rosterOutlook == null &&
    s.competitiveContextSummary == null
  )
}

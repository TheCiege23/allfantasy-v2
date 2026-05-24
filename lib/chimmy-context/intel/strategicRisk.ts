/**
 * Phase 2C Batch 4 Sub-batch F (slice 1) — Strategic Risk Scoring.
 *
 * Pure synthesizer over an already-built `ChimmyContextBundle`. Produces
 * per-dimension risk scores (0-100) plus a composite blend used by later
 * slices to:
 *   - order coaching hints / strategic risks adaptively
 *   - feed the recommendation prioritization engine
 *   - drive dashboard intelligence cards
 *
 * Constraints (preserved):
 *   - No I/O, no DB, no new providers (provider separation preserved).
 *   - All weights / thresholds live in `RISK_TUNABLES`.
 *   - NEVER throws — wrapped in try/catch returning a safe empty result.
 *   - Formula is INTENTIONALLY first-pass; tune via `RISK_TUNABLES`.
 *
 * Not wired into PromptComposer or `IntelligenceContextSlice` in this slice.
 * Sub-batch F slice 2 will route the result through `intelligenceBundle`.
 */

import type { ChimmyContextBundle } from "@/lib/chimmy-context/types"

export type RiskDimension =
  | "roster"
  | "injury"
  | "volatility"
  | "playoff"
  | "matchup"
  | "structural"

export type StrategicRiskScores = {
  roster: number
  injury: number
  volatility: number
  playoff: number
  matchup: number
  structural: number
  /** Tunable weighted blend across the six dimensions. */
  composite: number
  /** Per-dimension factual contribution tags (debug + ordering inputs). */
  signals: Record<RiskDimension, string[]>
}

/**
 * All weights / thresholds live here so future tuning is one edit. Each
 * dimension is scored additively from factual signals then clamped to
 * 0-100. The composite blend uses `compositeWeights` (sums to 1.0).
 */
export const RISK_TUNABLES = {
  roster: {
    perWeakPosition: 18,
    perShallowDepth: 12,
    rebuildIdentityBonus: 20,
    contenderIdentityRelief: -10,
  },
  injury: {
    injuryPressureSignal: 35,
    injuryExposureSignal: 30,
    injuryProneIdentityBonus: 20,
  },
  volatility: {
    volatilityHighSignal: 45,
    boomBustIdentityBonus: 30,
    projectionImbalanceBonus: 15,
  },
  playoff: {
    /** Score per week-distance bucket (0 = playoff week itself). */
    weeksUntilPlayoffsScore: { 0: 60, 1: 50, 2: 35, 3: 20, 4: 10 } as Record<
      number,
      number
    >,
    playoffWeekBonus: 25,
    clinchedRelief: -40,
    eliminatedRelief: -25,
    /** Extra points when standings rank is near the playoff cutoff. */
    nearCutoffBonus: 15,
    /** Distance from cutoff (in rank slots) considered "near". */
    nearCutoffDistance: 1,
  },
  matchup: {
    /** Tight projected margin (|margin| <= tightMarginThreshold) bonus. */
    tightMarginThreshold: 3,
    tightMarginScore: 35,
    /** Larger blowout-against bonus. */
    blowoutAgainstThreshold: 12,
    blowoutAgainstScore: 30,
    /** Urgency level → matchup risk contribution. */
    urgencyContribution: {
      critical: 30,
      high: 20,
      moderate: 10,
      low: 5,
      none: 0,
      unknown: 0,
    } as Record<string, number>,
    inProgressSignalBonus: 10,
  },
  structural: {
    perProjectionImbalance: 30,
    perWeakPosition: 10,
    perShallowDepth: 8,
    depthHeavyIdentityRelief: -15,
  },
  compositeWeights: {
    roster: 0.2,
    injury: 0.2,
    volatility: 0.1,
    playoff: 0.2,
    matchup: 0.2,
    structural: 0.1,
  } as Record<RiskDimension, number>,
} as const

const EMPTY_SIGNALS: Record<RiskDimension, string[]> = {
  roster: [],
  injury: [],
  volatility: [],
  playoff: [],
  matchup: [],
  structural: [],
}

const EMPTY_SCORES: StrategicRiskScores = {
  roster: 0,
  injury: 0,
  volatility: 0,
  playoff: 0,
  matchup: 0,
  structural: 0,
  composite: 0,
  signals: {
    roster: [],
    injury: [],
    volatility: [],
    playoff: [],
    matchup: [],
    structural: [],
  },
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo
  return Math.min(hi, Math.max(lo, n))
}

function countSignalPrefix(signals: readonly string[], prefix: string): number {
  let n = 0
  for (const sig of signals) if (sig.startsWith(prefix)) n += 1
  return n
}

/**
 * Synthesize per-dimension risk scores from a `ChimmyContextBundle`.
 * Never throws — returns a zeroed result on any internal error.
 */
export function computeStrategicRisks(
  bundle: ChimmyContextBundle
): StrategicRiskScores {
  try {
    const m = bundle.matchup ?? null
    const r = bundle.roster ?? null

    const weaknessSignals = r?.weaknessSignals ?? []
    const strengthSignals = r?.strengthSignals ?? []
    const urgencySignals = m?.urgencySignals ?? []
    const urgencyLevel = (m?.urgencyLevel ?? "unknown") as string
    const identity = r?.teamIdentityHint ?? "unknown"
    const projectedMargin = m?.projectedMargin ?? null
    const weeksUntilPlayoffs = m?.weeksUntilPlayoffs ?? null
    const isPlayoffWeek = m?.isPlayoffWeek === true
    const status = m?.status ?? "unknown"

    const signals: Record<RiskDimension, string[]> = {
      roster: [],
      injury: [],
      volatility: [],
      playoff: [],
      matchup: [],
      structural: [],
    }

    // ─── Roster risk ────────────────────────────────────────────────────────
    const weakCount = countSignalPrefix(weaknessSignals, "weak_position:")
    const shallowCount = countSignalPrefix(weaknessSignals, "shallow_depth:")
    let rosterRaw =
      weakCount * RISK_TUNABLES.roster.perWeakPosition +
      shallowCount * RISK_TUNABLES.roster.perShallowDepth
    if (weakCount > 0) signals.roster.push(`weak_position_count:${weakCount}`)
    if (shallowCount > 0)
      signals.roster.push(`shallow_depth_count:${shallowCount}`)
    if (identity === "rebuild") {
      rosterRaw += RISK_TUNABLES.roster.rebuildIdentityBonus
      signals.roster.push("identity:rebuild")
    } else if (identity === "contender") {
      rosterRaw += RISK_TUNABLES.roster.contenderIdentityRelief
      signals.roster.push("identity:contender")
    }

    // ─── Injury risk ────────────────────────────────────────────────────────
    let injuryRaw = 0
    if (urgencySignals.includes("injury_pressure")) {
      injuryRaw += RISK_TUNABLES.injury.injuryPressureSignal
      signals.injury.push("injury_pressure")
    }
    if (weaknessSignals.includes("injury_exposure")) {
      injuryRaw += RISK_TUNABLES.injury.injuryExposureSignal
      signals.injury.push("injury_exposure")
    }
    if (identity === "injury_prone") {
      injuryRaw += RISK_TUNABLES.injury.injuryProneIdentityBonus
      signals.injury.push("identity:injury_prone")
    }

    // ─── Volatility risk ────────────────────────────────────────────────────
    let volatilityRaw = 0
    if (weaknessSignals.includes("volatility_high")) {
      volatilityRaw += RISK_TUNABLES.volatility.volatilityHighSignal
      signals.volatility.push("volatility_high")
    }
    if (identity === "boom_bust") {
      volatilityRaw += RISK_TUNABLES.volatility.boomBustIdentityBonus
      signals.volatility.push("identity:boom_bust")
    }
    const imbalanceCount = countSignalPrefix(
      weaknessSignals,
      "projection_imbalance:"
    )
    if (imbalanceCount > 0) {
      volatilityRaw += RISK_TUNABLES.volatility.projectionImbalanceBonus
      signals.volatility.push(`projection_imbalance:${imbalanceCount}`)
    }

    // ─── Playoff risk ───────────────────────────────────────────────────────
    let playoffRaw = 0
    if (isPlayoffWeek) {
      playoffRaw += RISK_TUNABLES.playoff.playoffWeekBonus
      signals.playoff.push("playoff_week")
    }
    if (
      weeksUntilPlayoffs != null &&
      weeksUntilPlayoffs >= 0 &&
      weeksUntilPlayoffs in RISK_TUNABLES.playoff.weeksUntilPlayoffsScore
    ) {
      const add =
        RISK_TUNABLES.playoff.weeksUntilPlayoffsScore[weeksUntilPlayoffs] ?? 0
      playoffRaw += add
      signals.playoff.push(`weeks_to_playoffs:${weeksUntilPlayoffs}`)
    }
    if (urgencySignals.includes("clinched")) {
      playoffRaw += RISK_TUNABLES.playoff.clinchedRelief
      signals.playoff.push("clinched")
    }
    if (urgencySignals.includes("eliminated")) {
      playoffRaw += RISK_TUNABLES.playoff.eliminatedRelief
      signals.playoff.push("eliminated")
    }
    // Standings near-cutoff bonus
    const standings = bundle.standings?.rows ?? []
    const selfRow = standings.find((row) => row.teamId === m?.yourTeamId) ?? null
    const rank = selfRow?.rank ?? null
    const totalTeams = standings.length || null
    // Assume top half is playoff cutoff when totalTeams known (placeholder
    // until League.playoffTeamCount is plumbed through).
    if (rank != null && totalTeams != null) {
      const cutoff = Math.max(1, Math.floor(totalTeams / 2))
      const dist = Math.abs(rank - cutoff)
      if (dist <= RISK_TUNABLES.playoff.nearCutoffDistance) {
        playoffRaw += RISK_TUNABLES.playoff.nearCutoffBonus
        signals.playoff.push(`near_cutoff:${rank}/${totalTeams}`)
      }
    }

    // ─── Matchup risk ───────────────────────────────────────────────────────
    let matchupRaw = 0
    if (projectedMargin != null && Number.isFinite(projectedMargin)) {
      const absM = Math.abs(projectedMargin)
      if (absM <= RISK_TUNABLES.matchup.tightMarginThreshold) {
        matchupRaw += RISK_TUNABLES.matchup.tightMarginScore
        signals.matchup.push(`tight_margin:${projectedMargin}`)
      } else if (
        projectedMargin < 0 &&
        absM >= RISK_TUNABLES.matchup.blowoutAgainstThreshold
      ) {
        matchupRaw += RISK_TUNABLES.matchup.blowoutAgainstScore
        signals.matchup.push(`blowout_against:${projectedMargin}`)
      }
    }
    const urgencyContribution =
      RISK_TUNABLES.matchup.urgencyContribution[urgencyLevel] ?? 0
    if (urgencyContribution !== 0) {
      matchupRaw += urgencyContribution
      signals.matchup.push(`urgency:${urgencyLevel}`)
    }
    if (status === "in_progress") {
      matchupRaw += RISK_TUNABLES.matchup.inProgressSignalBonus
      signals.matchup.push("in_progress")
    }

    // ─── Structural risk ────────────────────────────────────────────────────
    let structuralRaw =
      imbalanceCount * RISK_TUNABLES.structural.perProjectionImbalance +
      weakCount * RISK_TUNABLES.structural.perWeakPosition +
      shallowCount * RISK_TUNABLES.structural.perShallowDepth
    if (imbalanceCount > 0)
      signals.structural.push(`projection_imbalance:${imbalanceCount}`)
    if (weakCount > 0) signals.structural.push(`weak_position:${weakCount}`)
    if (shallowCount > 0)
      signals.structural.push(`shallow_depth:${shallowCount}`)
    if (identity === "depth_heavy") {
      structuralRaw += RISK_TUNABLES.structural.depthHeavyIdentityRelief
      signals.structural.push("identity:depth_heavy")
    }

    // Reference strengthSignals so future tuning can apply relief without
    // breaking imports. (No current weight; reserved for slice 2+.)
    void strengthSignals

    const roster = clamp(rosterRaw, 0, 100)
    const injury = clamp(injuryRaw, 0, 100)
    const volatility = clamp(volatilityRaw, 0, 100)
    const playoff = clamp(playoffRaw, 0, 100)
    const matchup = clamp(matchupRaw, 0, 100)
    const structural = clamp(structuralRaw, 0, 100)

    const w = RISK_TUNABLES.compositeWeights
    const composite = clamp(
      roster * w.roster +
        injury * w.injury +
        volatility * w.volatility +
        playoff * w.playoff +
        matchup * w.matchup +
        structural * w.structural,
      0,
      100
    )

    return {
      roster,
      injury,
      volatility,
      playoff,
      matchup,
      structural,
      composite: Math.round(composite),
      signals,
    }
  } catch {
    return { ...EMPTY_SCORES, signals: { ...EMPTY_SIGNALS } }
  }
}

/** Convenience: dimensions ordered descending by score (ties broken by name). */
export function rankRiskDimensions(
  scores: StrategicRiskScores
): Array<{ dimension: RiskDimension; score: number }> {
  const dims: RiskDimension[] = [
    "roster",
    "injury",
    "volatility",
    "playoff",
    "matchup",
    "structural",
  ]
  return dims
    .map((dimension) => ({ dimension, score: scores[dimension] }))
    .sort((a, b) =>
      b.score === a.score
        ? a.dimension.localeCompare(b.dimension)
        : b.score - a.score
    )
}

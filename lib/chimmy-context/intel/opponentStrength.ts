/**
 * Phase 2C Batch 3 — Opponent strength SCAFFOLD.
 *
 * Intentionally a placeholder. Per the implementation rules for this batch:
 *   - "Do NOT finalize opponent-strength formulas yet."
 *   - "Build extensible systems for future tuning."
 *
 * This module defines the **shape** of opponent-strength scoring and ships
 * a neutral default implementation (`null` for every metric, empty notes)
 * so downstream code can wire to it today without behaviour churn.
 *
 * Future batches will:
 *   - Blend AfPowerScore (LeagueTeam.aiPowerScore), projectedWins, recent
 *     form, head-to-head history, and league-strength normalization.
 *   - Replace `computeOpponentStrength` with a real implementation behind
 *     the same signature.
 *
 * Contract: NEVER throw; always return a fully populated result with
 * nullable metric fields when not yet computed.
 */

export type OpponentStrengthInput = {
  /** Opponent LeagueTeam.id when available. */
  opponentTeamId: string | null
  /** Opponent LeagueTeam.aiPowerScore (pre-baked). */
  opponentAiPowerScore: number | null
  /** Opponent LeagueTeam.projectedWins (pre-baked). */
  opponentProjectedWins: number | null
  /** Opponent recent W/L streak summary (optional, future use). */
  opponentRecentForm: string | null
  /** League-wide context for normalization (optional, future use). */
  leagueMeanAiPowerScore: number | null
}

export type OpponentStrengthRating =
  | "elite"
  | "above_average"
  | "average"
  | "below_average"
  | "weak"
  | "unknown"

export type OpponentStrengthOutput = {
  /** Overall categorical rating; "unknown" until formulas land. */
  rating: OpponentStrengthRating
  /** Numeric 0-100 strength score; `null` until formulas land. */
  score: number | null
  /** Per-factor signals (all nullable until tuned). */
  factors: {
    afPowerScore: number | null
    leagueRelativeStrength: number | null
    projectedWinsDelta: number | null
    recentForm: string | null
  }
  /** Optional short human-readable notes for prompt assembly. */
  notes: string[]
  /** Echo of inputs we recognized; future formulas will consume these. */
  inputs: OpponentStrengthInput
}

const NEUTRAL_NOTES: ReadonlyArray<string> = [] as const

/**
 * Placeholder implementation. Returns a fully-populated, neutral result so
 * callers can rely on the shape today. Replace internals (not the signature)
 * when finalized weights / thresholds are approved.
 */
export function computeOpponentStrength(
  input: OpponentStrengthInput
): OpponentStrengthOutput {
  // TODO(Phase 2C Batch 4+): blend afPowerScore × leagueRelativeStrength
  // × projectedWinsDelta × recentForm into a 0-100 score, then map score
  // to OpponentStrengthRating with tunable thresholds.
  return {
    rating: "unknown",
    score: null,
    factors: {
      afPowerScore: input.opponentAiPowerScore,
      leagueRelativeStrength:
        input.leagueMeanAiPowerScore != null && input.opponentAiPowerScore != null
          ? Number(
              (input.opponentAiPowerScore - input.leagueMeanAiPowerScore).toFixed(3)
            )
          : null,
      projectedWinsDelta: null,
      recentForm: input.opponentRecentForm,
    },
    notes: [...NEUTRAL_NOTES],
    inputs: input,
  }
}

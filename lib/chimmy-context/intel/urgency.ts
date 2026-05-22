/**
 * Phase 2C Batch 3 — Urgency / playoff-pressure SCAFFOLD.
 *
 * Intentionally a placeholder. Per the implementation rules:
 *   - "Do NOT hardcode final urgency weights."
 *   - "Build extensible systems for future tuning."
 *
 * Computes a categorical urgency level for a matchup decision context
 * (lineup choice, waiver claim, trade). Returns "unknown" / neutral
 * defaults until the formula is approved.
 *
 * Future batches will weight:
 *   - weeksUntilPlayoffs (closer → higher)
 *   - playoff-clinch / elimination math from standings
 *   - margin-of-error vs opponent projection
 *   - whether lineup is already locked
 *
 * Contract: NEVER throws; always returns a fully populated result.
 */

export type UrgencyInput = {
  week: number | null
  playoffStartWeek: number | null
  weeksUntilPlayoffs: number | null
  isPlayoffWeek: boolean
  /** Matchup status reported by TeamWeekResult. */
  matchupStatus: "scheduled" | "in_progress" | "final" | "unknown"
  /** Whether the viewer is mathematically eliminated (future use). */
  isEliminated: boolean | null
  /** Whether the viewer has clinched a playoff seed (future use). */
  hasClinchedPlayoffs: boolean | null
}

export type UrgencyLevel =
  | "critical"
  | "high"
  | "moderate"
  | "low"
  | "none"
  | "unknown"

export type UrgencyOutput = {
  level: UrgencyLevel
  /** Numeric 0-100 urgency score; `null` until formula lands. */
  score: number | null
  /** Short human-readable signal tags for prompt assembly. */
  signals: string[]
  inputs: UrgencyInput
}

/**
 * Placeholder implementation. Emits only safe, factual signals derived
 * directly from inputs (no fabricated weights). Replace internals (not
 * the signature) when finalized weights are approved.
 */
export function computeUrgency(input: UrgencyInput): UrgencyOutput {
  const signals: string[] = []

  if (input.isPlayoffWeek) signals.push("playoff_week")
  if (
    !input.isPlayoffWeek &&
    input.weeksUntilPlayoffs != null &&
    input.weeksUntilPlayoffs <= 2 &&
    input.weeksUntilPlayoffs >= 1
  ) {
    signals.push("playoff_push")
  }
  if (input.matchupStatus === "in_progress") signals.push("in_progress")
  if (input.hasClinchedPlayoffs === true) signals.push("clinched")
  if (input.isEliminated === true) signals.push("eliminated")

  // TODO(Phase 2C Batch 4+): convert signals + weeksUntilPlayoffs into
  // a numeric 0-100 score and map to UrgencyLevel with tunable thresholds.
  return {
    level: "unknown",
    score: null,
    signals,
    inputs: input,
  }
}

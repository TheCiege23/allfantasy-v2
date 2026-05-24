/**
 * Phase 2C Batch 4 — Competitive context weighting SCAFFOLD.
 *
 * Carries the inputs a future AI prompt-assembly layer will use to weight
 * recommendations by league difficulty, user skill, opponent quality,
 * standings pressure, league format, and scoring complexity.
 *
 * Per Phase 2C Batch 4 constraints we do NOT finalize weights here; this
 * module:
 *   - Defines the typed bundle.
 *   - Echoes inputs into `inputs`.
 *   - Returns all weight values as `null` placeholders.
 *
 * Contract: pure, never throws, no I/O.
 */

export type LeagueFormat =
  | "redraft"
  | "dynasty"
  | "keeper"
  | "bestball"
  | "auction"
  | "unknown"

export type CompetitiveContextInput = {
  /** League difficulty score (0-100) from league-difficulty engine. */
  leagueDifficultyScore: number | null
  /** User skill / ranking snapshot composite (0-100). */
  userSkillScore: number | null
  /** Opponent quality composite (0-100). */
  opponentQualityScore: number | null
  /** Standings pressure (0-100); higher = closer to in/out cutoff. */
  standingsPressureScore: number | null
  /** League format taxonomy. */
  leagueFormat: LeagueFormat
  /** Scoring complexity score (0-100). */
  scoringComplexityScore: number | null
  /** Sport identifier (e.g. "nfl", "nba"). */
  sport: string | null
}

export type CompetitiveWeights = {
  leagueDifficulty: number | null
  userSkill: number | null
  opponentQuality: number | null
  standingsPressure: number | null
  leagueFormat: number | null
  scoringComplexity: number | null
}

export type CompetitiveContextOutput = {
  weights: CompetitiveWeights
  inputs: CompetitiveContextInput
  notes: string[]
}

const NEUTRAL_WEIGHTS: CompetitiveWeights = {
  leagueDifficulty: null,
  userSkill: null,
  opponentQuality: null,
  standingsPressure: null,
  leagueFormat: null,
  scoringComplexity: null,
}

export function buildCompetitiveContext(
  input: CompetitiveContextInput
): CompetitiveContextOutput {
  // TODO(Phase 2C Batch 5+): derive each weight from approved formulas
  // (e.g. leagueDifficulty weight grows with leagueDifficultyScore,
  //  standingsPressure weight grows as user nears playoff cutoff, etc.).
  return {
    weights: { ...NEUTRAL_WEIGHTS },
    inputs: input,
    notes: [],
  }
}

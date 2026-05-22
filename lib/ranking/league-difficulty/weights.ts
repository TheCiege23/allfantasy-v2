/**
 * Phase 2C — League Difficulty Weights
 *
 * All tunable knobs for the league-difficulty engine live here.
 * Every value is provisional and intended to be re-tuned later via:
 *   - admin overrides (env / DB-backed),
 *   - matchmaking calibration runs,
 *   - playtest feedback.
 *
 * IMPORTANT: do NOT inline numbers into `engine.ts`. If you find yourself
 * reaching for a magic number there, add it here first.
 */

/** Final difficulty score is clamped to this range. Matches existing `LeagueDifficultyRating`. */
export const DIFFICULTY_SCORE_RANGE = { min: 0, max: 10_000 } as const

/** Anchor `base` score before any modifiers are applied. */
export const BASE_DIFFICULTY = 5_000

/** Multiplier clamps applied to the four standard modifiers. */
export const MODIFIER_CLAMPS = {
  leagueType: { min: 0.7, max: 1.6 },
  scoringComplexity: { min: 0.8, max: 1.4 },
  opponentStrength: { min: 0.7, max: 1.4 },
  activity: { min: 0.8, max: 1.2 },
} as const

/** League-type base multipliers. Unknown / empty → 1.0. */
export const LEAGUE_TYPE_MULTIPLIER: Readonly<Record<string, number>> = {
  redraft: 1.0,
  keeper: 1.10,
  dynasty: 1.25,
  bestball: 0.9,
  "best ball": 0.9,
  guillotine: 1.20,
  survivor: 1.25,
  "big brother": 1.25,
  devy: 1.25,
  koth: 1.20,
  "king of the hill": 1.20,
  zombie: 1.15,
  gambit: 1.15,
  graveyard: 1.15,
  royal: 1.15,
  orphan: 1.05,
}

/** Scoring-complexity contributions (additive, then clamped). */
export const SCORING_COMPLEXITY_POINTS = {
  ppr: 0.05,
  halfPpr: 0.03,
  superflex: 0.10,
  twoQb: 0.10,
  tePremium: 0.06,
  idp: 0.12,
  custom: 0.08,
} as const

/** Team-count base contribution (added to leagueType multiplier). */
export const TEAM_COUNT_BANDS: ReadonlyArray<{ atMost: number; bonus: number }> = [
  { atMost: 8, bonus: -0.05 },
  { atMost: 10, bonus: 0 },
  { atMost: 12, bonus: 0.03 },
  { atMost: 14, bonus: 0.06 },
  { atMost: 16, bonus: 0.10 },
  { atMost: Number.POSITIVE_INFINITY, bonus: 0.14 },
]

/** Roster-depth contribution per starter slot above the 9-baseline. */
export const ROSTER_DEPTH = {
  baselineStarters: 9,
  perExtraStarter: 0.015,
  perTaxiSlot: 0.005,
  perIrSlot: 0.003,
} as const

/** Dynasty-depth contribution (only applied when dynasty / keeper / devy). */
export const DYNASTY_DEPTH = {
  perRookiePickRound: 0.02,
  perDevySlot: 0.01,
} as const

/** Multi-sport base multiplier (placeholder — broader sport mix planned). */
export const SPORT_MULTIPLIER: Readonly<Record<string, number>> = {
  NFL: 1.0,
  NBA: 1.05,
  MLB: 1.10,
  NHL: 1.05,
  CFB: 1.05,
  CBB: 1.05,
  Soccer: 1.05,
}

/** Elimination-mechanics tag → extra multiplier. */
export const ELIMINATION_BUMP = 0.10

/** Custom-scoring tag → extra multiplier. */
export const CUSTOM_SCORING_BUMP = 0.05

/** Transaction-pressure (waiver flavor). */
export const TRANSACTION_PRESSURE: Readonly<Record<string, number>> = {
  faab: 1.05,
  rolling: 1.0,
  reverse: 0.95,
  none: 0.92,
}

/**
 * Neutral values for any modifier we cannot yet compute from data.
 * These will be progressively replaced by Batch 3.
 */
export const NEUTRAL_PLACEHOLDER = 1.0

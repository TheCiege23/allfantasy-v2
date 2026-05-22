/**
 * Phase 2C — Ranking Snapshot Weights
 *
 * All tunable knobs for the snapshot composition engine.
 */

/** AF Rating clamp. Matches `SportRating.rating` documented range. */
export const RATING_RANGE = { min: 0, max: 10_000 } as const

/** Base rating before history adjustments. */
export const BASE_RATING = 5_000

/**
 * Per-source weights. Used to weight composite ratings if multiple sources
 * contribute. Tuned for later — defaults are equal.
 */
export const SOURCE_WEIGHT: Readonly<Record<string, number>> = {
  sleeper_history: 1.0,
  yahoo_history: 1.0,
  espn_history: 1.0,
  mfl_history: 1.0,
  fleaflicker_history: 1.0,
  fantrax_history: 1.0,
  platform_native: 1.2,
  manual_admin_adjustment: 0.8,
}

/** Per-component contributions to a `SportRating`. */
export const COMPONENT_CONTRIB = {
  /** rating bump per 0.01 win-rate above .500, clamped */
  winRatePer1Pct: 12,
  /** rating bump per championship (recency-weighted upstream) */
  perChampionship: 220,
  /** rating bump per playoff appearance */
  perPlayoffAppearance: 80,
  /** rating bump per season of activity (caps via clamp) */
  perSeason: 25,
  /** league-difficulty effective average (0..10000) → bump per 1000 above 5000 */
  perDifficultyAbove5kK: 120,
} as const

/** Hard caps so a single component cannot dominate the rating. */
export const COMPONENT_CAPS = {
  winRate: 600,
  championships: 1500,
  playoffAppearances: 800,
  seasons: 400,
  difficulty: 800,
} as const

/** Multi-sport composition: overall rating weighting by sport. */
export const SPORT_BLEND_WEIGHT: Readonly<Record<string, number>> = {
  NFL: 1.0,
  NBA: 0.8,
  MLB: 0.7,
  NHL: 0.7,
  CFB: 0.7,
  CBB: 0.7,
  Soccer: 0.7,
}

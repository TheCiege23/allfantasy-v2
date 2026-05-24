/**
 * Phase 6B — Resume + Aggregation Weights
 *
 * All tunable knobs for the resume aggregation, credibility, and matchmaking
 * layers. NO MAGIC NUMBERS may live outside this file. Tuning happens here.
 */

import type { RankingSource } from "@/lib/ranking/types"
import type { ProviderTrust } from "@/lib/resume/types"

/**
 * Visibility privilege ladder.
 *
 * The number expresses the minimum viewer privilege required to see a
 * section. Higher = stricter. Anonymous web visitors have privilege 1
 * ("public"); leaguemates have 2; friends have 3; the owner has 4
 * (special-cased — always sees everything). `private` is intentionally
 * unreachable by any non-owner.
 */
export const VISIBILITY_PRIVILEGE = {
  public: 1,
  leagues: 2,
  friends: 3,
  private: 99,
} as const

/**
 * Default per-provider trust weights for credibility scoring.
 * Native AllFantasy data is the gold standard.
 */
export const PROVIDER_TRUST_DEFAULTS: ProviderTrust = {
  platform_native: 1.0,
  sleeper_history: 0.85,
  yahoo_history: 0.85,
  espn_history: 0.8,
  mfl_history: 0.8,
  fleaflicker_history: 0.8,
  fantrax_history: 0.75,
  manual_admin_adjustment: 0.5,
} as const

/** Penalties applied to credibility confidence. */
export const CREDIBILITY_PENALTY = {
  perSuspiciousFlag: 0.1,
  perUnverifiedHighValueTrophy: 0.15,
  minConfidence: 0.0,
  maxConfidence: 1.0,
} as const

/** Percentile binning thresholds. */
export const PERCENTILE_BANDS = {
  /** Below this percentile -> "developing". */
  developing: 0.4,
  /** Below this percentile -> "competitive". */
  competitive: 0.7,
  /** Below this percentile -> "elite". */
  elite: 0.9,
  /** >= this -> "legendary". */
  legendary: 0.99,
} as const

/** Weights for the activity score (0..1 normalized). */
export const ACTIVITY_WEIGHTS = {
  seasonsRecency: 0.4,
  leagueDiversity: 0.25,
  formatDiversity: 0.2,
  transactionsPerWeek: 0.15,
} as const

/** Weights for the reliability score (0..1 normalized). */
export const RELIABILITY_WEIGHTS = {
  /** Inverse of inactivity weeks share. */
  attendance: 0.45,
  /** Lineup-set rate. */
  lineupSetRate: 0.25,
  /** No-show / abandonment penalty (inverse). */
  noAbandonment: 0.2,
  /** Commissioner-side dispute penalty (inverse). */
  noDisputes: 0.1,
} as const

/** Weights for matchmaking compatibility. */
export const MATCHMAKING_WEIGHTS = {
  ratingProximity: 0.3,
  difficultyPreference: 0.2,
  formatOverlap: 0.2,
  sportOverlap: 0.15,
  activityAlignment: 0.1,
  reliability: 0.05,
} as const

/** Hard bands used to clamp normalized scores. */
export const SCORE_RANGE = { min: 0, max: 1 } as const

/** Rating clamp matches `lib/ranking/snapshot/weights.RATING_RANGE`. */
export const RATING_RANGE = { min: 0, max: 10_000 } as const

/** Per-source weight used when reconciling duplicate trophies. */
export const SOURCE_DEDUPE_PRIORITY: Readonly<Record<RankingSource, number>> = {
  platform_native: 100,
  sleeper_history: 80,
  yahoo_history: 75,
  espn_history: 70,
  mfl_history: 65,
  fleaflicker_history: 60,
  fantrax_history: 55,
  manual_admin_adjustment: 40,
} as const

/**
 * Phase 1 — ranking placeholder interfaces.
 *
 * No DB migrations yet. These types lock down the shape the ranking system
 * will produce so downstream UI/services can compile against a stable contract.
 *
 * Future phases will:
 *   - Persist `RankingSnapshot` rows per user/sport.
 *   - Hydrate `ImportedHistoryScore` from Sleeper / Yahoo / ESPN imports.
 *   - Compute `LeagueDifficultyRating` from league type, scoring, and roster size.
 *   - Feed the league-finder ranker and Chimmy's contextual prompts.
 */

/** Sports the ranker can score (must align with `lib/sport-scope` SUPPORTED_SPORTS). */
export type RankingSport = 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'CFB' | 'CBB' | 'Soccer'

/** Source of a rating signal. */
export type RankingSource =
  | 'sleeper_history'
  | 'yahoo_history'
  | 'espn_history'
  | 'mfl_history'
  | 'fleaflicker_history'
  | 'fantrax_history'
  | 'platform_native'
  | 'manual_admin_adjustment'

/** Per-sport rating with the components that produced it. */
export interface SportRating {
  sport: RankingSport
  /** 0–10000 ELO-like internal scale. */
  rating: number
  /** Optional sub-component contributions. Sum need not equal `rating`. */
  components?: {
    winRate?: number
    championships?: number
    playoffAppearances?: number
    activityScore?: number
    leagueDifficulty?: number
  }
}

/** Imported history rollup for a single platform/account. */
export interface ImportedHistoryScore {
  source: RankingSource
  wins: number
  losses: number
  ties: number
  championships: number
  playoffAppearances: number
  seasons: number
  /** Optional: most recent season the data covers. */
  lastSeason?: number | null
}

/**
 * Difficulty multipliers applied on top of base league difficulty.
 * Each modifier defaults to 1.0 (neutral).
 */
export interface LeagueDifficultyModifiers {
  /** Redraft = 1.0, Keeper = 1.1, Dynasty = 1.25, Best Ball = 0.9. */
  leagueTypeMultiplier: number
  /** PPR variants, custom scoring complexity. 0.9–1.3 typical. */
  scoringComplexityModifier: number
  /** Average opponent rating vs platform mean. 0.8–1.3 typical. */
  opponentStrengthModifier: number
  /** League activity (trades/waivers/chat per week). 0.85–1.15 typical. */
  activityModifier: number
}

/** Per-league difficulty rating used to weight wins/losses in the ranker. */
export interface LeagueDifficultyRating {
  leagueId: string
  /** Base difficulty before modifiers (0–10000). */
  base: number
  modifiers: LeagueDifficultyModifiers
  /** base * product(modifiers), clamped 0–10000. */
  effective: number
}

/** Top-level AF user rating, aggregated across sports. */
export interface AFUserRating {
  userId: string
  /** Weighted average across sports the user actively plays. */
  overall: number
  sports: SportRating[]
  importedHistory: ImportedHistoryScore[]
  capturedAt: string // ISO timestamp
}

/** Snapshot persisted whenever rankings are recomputed. */
export interface RankingSnapshot {
  userId: string
  capturedAt: string // ISO timestamp
  rating: AFUserRating
  leagueDifficulties: LeagueDifficultyRating[]
  sources: RankingSource[]
}

/** Neutral defaults for callers that need a typed placeholder before data exists. */
export const NEUTRAL_DIFFICULTY_MODIFIERS: LeagueDifficultyModifiers = {
  leagueTypeMultiplier: 1,
  scoringComplexityModifier: 1,
  opponentStrengthModifier: 1,
  activityModifier: 1,
}

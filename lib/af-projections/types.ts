/**
 * AF Projections — shared types for the Phase 2 engine.
 *
 * NAMING WARNING. Three similarly-named things exist and only one is live:
 *   - `lib/projection-engine/`            LIVE read layer (start/sit, waivers, trade value)
 *   - `lib/projections/projection-engine.ts`  a class with ZERO callers — not this, do not extend
 *   - `lib/af-projections/`               THIS module — computes AFProjectionSnapshot rows
 *
 * This module is PURE: no prisma, no fetch, no clock reads beyond what is passed in.
 * That keeps the honesty rules testable without a database, which is the whole point —
 * the failure this engine exists to prevent (numbers that look authoritative and are
 * not) is a logic failure, not an I/O failure.
 */

/** Scoring formats for which weekly actuals are directly available (`pts_*`, 98% coverage). */
export type ScoringFormat = 'ppr' | 'half_ppr' | 'std'

/**
 * How a projection's baseline was derived. Mirrors the honesty convention already used by
 * `ProjectionBasis` in resolveNormalizedPlayerSportsProfiles: the basis is carried, not hidden,
 * so a proxy can never be presented as a true weekly projection.
 */
export type AfProjectionBasis =
  /** Recency-weighted per-week actuals in the requested scoring format. Strongest basis. */
  | 'weekly_actuals_recency'
  /**
   * Prior-season DraftKings points per game. DK NFL scoring is close to full PPR but NOT
   * identical (yardage bonuses), so this is a proxy and must be labelled as one — especially
   * for a non-PPR league.
   */
  | 'season_dk_fppg_proxy'
  /**
   * Weekly IDP components (`idp_tkl_solo`, `idp_sack`, …) scored under the league's own IDP
   * rules. Strongest IDP basis: real per-week observations, league-correct scoring.
   */
  | 'weekly_idp_components'
  /**
   * Prior-season IDP components scored under the league's rules. Weaker than weekly — a
   * season total carries no within-season role change — and its tackle split may be estimated.
   */
  | 'season_idp_components'

/** Which vocabulary a raw stat map speaks. */
export type IdpSourceKind = 'sleeper_weekly' | 'ri_season'

export interface IdpScoringBreakdown {
  points: number
  scoredComponents: string[]
  /** Components present in the data but carrying no rule in this league. Named, not dropped. */
  unscoredComponents: string[]
  /** Non-empty when a stated approximation was applied. Surfaced to the reader. */
  approximations: string[]
  usedMeasuredTackleSplit: boolean
}

export type ConfidenceLevel = 'high' | 'medium' | 'low'

/** Season-aggregate components for one player, extracted from `FantasyStatLine.stats`. */
export interface SeasonAggregate {
  /** Never defaulted. Absent or zero => refusal, because every rate divides by it. */
  gamesPlayed: number
  /** Numeric components under `regular_season`, flattened one level. */
  components: Record<string, number>
  position: string | null
  team: string | null
  playerName: string | null
  /** DraftKings points per game when the provider supplied it. */
  dkPointsPerGame: number | null
}

/** One week of observed production, from `PlayerGameStat.normalizedStatMap`. */
export interface WeeklyObservation {
  week: number
  ptsPpr: number | null
  ptsHalfPpr: number | null
  ptsStd: number | null
  /** Offensive snaps played, and the team total, when present — the role signal. */
  offSnaps: number | null
  teamOffSnaps: number | null
  targets: number | null
}

/** Ordinal role from the NFL depth chart (`WR1`/`WR2`/`RB`/`QB`/`TE`…). */
export interface DepthRole {
  slot: string
  /** 1 for WR1/RB1/QB1, 2 for WR2, etc. Null when the slot carries no ordinal. */
  ordinal: number | null
}

export interface ConfidenceInput {
  gamesPlayed: number
  /** Number of weekly observations actually used. 0 when the Sleeper id was unmatched. */
  weeklyWeeksUsed: number
  hasDepthRole: boolean
  /** An injury designation is *known*; absence is not health, so this is coverage only. */
  hasInjuryStatus: boolean
  /** True when the baseline came from a season prior to the one being projected. */
  basisIsPriorSeason: boolean
}

export interface ConfidenceResult {
  level: ConfidenceLevel
  /** 0..1, the coverage fraction the level was derived from. Never a constant. */
  score: number
  /** Human-readable coverage facts. Rendered, so they must be true statements. */
  reasons: string[]
}

/**
 * A refusal is a first-class outcome, not an error. The brief's rule: refuse to emit a
 * projection rather than emit a low-confidence guess presented as a number.
 */
export interface ProjectionRefusal {
  ok: false
  reason:
    | 'no_games_played'
    | 'no_scoring_basis'
    | 'insufficient_sample'
  detail: string
}

export interface ProjectionResult {
  ok: true
  /** Points per game in the requested format, before adjustments. */
  baselineProjection: number
  /** Baseline plus every applied adjustment. Equals baseline when none applied. */
  afProjection: number
  basis: AfProjectionBasis
  scoringFormat: ScoringFormat
  confidence: ConfidenceResult
  /** Names the adjustments actually applied. Empty array when none were. */
  adjustmentsApplied: string[]
  /** Null when nothing was adjusted — never a filler sentence. */
  adjustmentReason: string | null
  weeklyWeeksUsed: number
  /** Present only when the basis was IDP component scoring. */
  idp?: IdpScoringBreakdown | null
}

export type ProjectionOutcome = ProjectionResult | ProjectionRefusal

/**
 * AF Projections — assemble a projection, or refuse.
 *
 * Pure. Every input is passed in; nothing is fetched. The caller (the writer, in the next
 * increment) is responsible for resolving ids across the three namespaces:
 *   FantasyStatLine -> canonical uuid, PlayerGameStat -> Sleeper id, DepthChart -> RI id.
 * `PlayerIdentityMap` carries rollingInsightsId for 1933/1933 NFL players but sleeperId for
 * only 1026 (53.1%), so `weekly` will legitimately be empty for about half the pool.
 */

import {
  deriveConfidence,
  extractSeasonAggregate,
  parseDepthRole,
  recencyWeightedPoints,
} from './core'
import type {
  ProjectionOutcome,
  ScoringFormat,
  SeasonAggregate,
  WeeklyObservation,
} from './types'

export interface BuildProjectionInput {
  /** Raw `FantasyStatLine.stats` payload, or a pre-extracted aggregate. */
  statsJson?: unknown
  aggregate?: SeasonAggregate | null
  /** Weekly observations for THIS player. Empty when the Sleeper id was unmatched. */
  weekly?: WeeklyObservation[]
  /** Depth-chart slot, e.g. "WR2". */
  depthSlot?: string | null
  /**
   * Injury designation if one is on file. `null` means no designation is stated — which is
   * NOT a statement of health, and is treated purely as missing coverage.
   */
  injuryStatus?: string | null
  scoringFormat: ScoringFormat
  /** True when the baseline season precedes the season being projected. */
  basisIsPriorSeason: boolean
  /** Minimum games in the season sample before a projection may be emitted at all. */
  minGamesPlayed?: number
  recencyHalfLife?: number
}

const DEFAULT_MIN_GAMES = 2

/**
 * Returns a projection or a typed refusal. Never throws for missing data — absent inputs are
 * an expected outcome, and the refusal carries the reason so a caller can report it honestly
 * instead of rendering a blank.
 */
export function buildAfProjection(input: BuildProjectionInput): ProjectionOutcome {
  const aggregate =
    input.aggregate ?? (input.statsJson !== undefined ? extractSeasonAggregate(input.statsJson) : null)

  if (!aggregate) {
    return {
      ok: false,
      reason: 'no_games_played',
      detail: 'No season aggregate with a positive games_played could be extracted.',
    }
  }

  const minGames = input.minGamesPlayed ?? DEFAULT_MIN_GAMES
  if (aggregate.gamesPlayed < minGames) {
    return {
      ok: false,
      reason: 'insufficient_sample',
      detail: `Only ${aggregate.gamesPlayed} game(s) in the season sample; minimum is ${minGames}.`,
    }
  }

  const weekly = input.weekly ?? []
  const recency = recencyWeightedPoints(weekly, input.scoringFormat, input.recencyHalfLife ?? 4)

  // Basis precedence: real weekly actuals in the requested format beat a DraftKings
  // season proxy. Both are labelled; neither is silently substituted for the other.
  let baselineProjection: number
  let basis: ProjectionOutcomeBasis
  let weeklyWeeksUsed = 0

  if (recency) {
    baselineProjection = recency.value
    basis = 'weekly_actuals_recency'
    weeklyWeeksUsed = recency.weeksUsed
  } else if (aggregate.dkPointsPerGame != null) {
    baselineProjection = aggregate.dkPointsPerGame
    basis = 'season_dk_fppg_proxy'
  } else {
    return {
      ok: false,
      reason: 'no_scoring_basis',
      detail:
        'No weekly points in the requested format and no DraftKings points-per-game on the season aggregate.',
    }
  }

  const depthRole = parseDepthRole(input.depthSlot)

  const confidence = deriveConfidence({
    gamesPlayed: aggregate.gamesPlayed,
    weeklyWeeksUsed,
    hasDepthRole: depthRole != null,
    hasInjuryStatus: Boolean(input.injuryStatus),
    basisIsPriorSeason: input.basisIsPriorSeason,
  })

  // No adjustments are applied in this increment. Saying so explicitly — rather than
  // emitting a plausible-looking reason string — is the point: `adjustmentReason` must name
  // adjustments that actually happened, so it stays null until opponent/weather/injury
  // layers land.
  const adjustmentsApplied: string[] = []
  const afProjection = baselineProjection

  const notes: string[] = []
  if (basis === 'season_dk_fppg_proxy' && input.scoringFormat !== 'ppr') {
    // DraftKings NFL scoring is close to full PPR, so using it as a standard or half-PPR
    // baseline overstates receiving production. Stated, not silently corrected.
    notes.push(
      `Baseline is DraftKings points per game, which is close to full PPR — it overstates a ${input.scoringFormat} league.`,
    )
  }

  return {
    ok: true,
    baselineProjection: round2(baselineProjection),
    afProjection: round2(afProjection),
    basis,
    scoringFormat: input.scoringFormat,
    confidence: notes.length
      ? { ...confidence, reasons: [...confidence.reasons, ...notes] }
      : confidence,
    adjustmentsApplied,
    adjustmentReason: adjustmentsApplied.length ? adjustmentsApplied.join('; ') : null,
    weeklyWeeksUsed,
  }
}

type ProjectionOutcomeBasis = Extract<ProjectionOutcome, { ok: true }>['basis']

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

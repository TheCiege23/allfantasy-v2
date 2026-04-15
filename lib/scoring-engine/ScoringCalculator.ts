/**
 * lib/scoring-engine/ScoringCalculator.ts
 * Universal calculateFantasyPoints() with per-sport stat-key mappers.
 *
 * Usage (server or edge):
 *   const pts = calculateFantasyPoints('NFL', { passing_yards: 300, passing_td: 2 }, scoringRules)
 *   // → 300 * 0.04 + 2 * 4 = 20
 *
 * The calculator is intentionally stateless and pure — no DB calls.
 * All it does is multiply each known stat value by its scoring rule.
 *
 * For sports where the same underlying event maps to multiple scoring keys
 * (e.g. NHL hat_trick_bonus), those keys must both be present in `stats`.
 */

import type { SupportedSport } from './ScoringEngineTypes'

// ---------------------------------------------------------------------------
// Core calculation — sport-agnostic
// ---------------------------------------------------------------------------

/**
 * Multiply matching keys from `stats` by values in `rules` and sum.
 * Any stat key not found in `rules` is ignored (worth 0 pts).
 */
export function calculateFantasyPoints(
  _sport: SupportedSport,
  stats: Record<string, number>,
  rules: Record<string, number>,
): number {
  let total = 0
  for (const [key, value] of Object.entries(stats)) {
    const ruleValue = rules[key]
    if (ruleValue !== undefined && ruleValue !== 0 && value !== 0) {
      total += value * ruleValue
    }
  }
  return Math.round(total * 100) / 100   // round to 2dp
}

// ---------------------------------------------------------------------------
// Stat-line normalisers — convert provider-specific stat names to AF keys
// ---------------------------------------------------------------------------

/** Sleeper NFL stat payload -> AF stat keys */
export function normalizeSleeperNflStats(
  raw: Record<string, number>,
): Record<string, number> {
  const map: Record<string, string> = {
    pass_yd:   'passing_yards',
    pass_td:   'passing_td',
    pass_int:  'interception_thrown',
    rush_yd:   'rushing_yards',
    rush_td:   'rushing_td',
    rec:       'reception',
    rec_yd:    'receiving_yards',
    rec_td:    'receiving_td',
    fum_lost:  'fumble_lost',
    fum:       'fumble',
    bonus_pass_yd_300: 'three_hundred_yd_pass_bonus',
    bonus_pass_yd_400: 'four_hundred_yd_pass_bonus',
    bonus_rush_yd_100: 'one_hundred_yd_rush_bonus',
    bonus_rush_yd_200: 'two_hundred_yd_rush_bonus',
    bonus_rec_yd_100:  'one_hundred_yd_rec_bonus',
    bonus_rec_yd_200:  'two_hundred_yd_rec_bonus',
    pts_allow_0:        'dst_pa_0',
    pts_allow_1_6:      'dst_pa_1_6',
    pts_allow_7_13:     'dst_pa_7_13',
    pts_allow_14_20:    'dst_pa_14_20',
    pts_allow_21_27:    'dst_pa_21_27',
    pts_allow_28_34:    'dst_pa_28_34',
    pts_allow_35p:      'dst_pa_35_plus',
    sack:       'dst_sack',
    int:        'dst_interception',
    fum_rec:    'dst_fumble_recovery',
    safe:       'dst_safety',
    td:         'dst_td',
    blk_kick:   'dst_blocked_kick',
    pat_made:   'pat_made',
    pat_miss:   'pat_missed',
  }
  const out: Record<string, number> = {}
  for (const [raw_key, val] of Object.entries(raw)) {
    const afKey = map[raw_key] ?? raw_key
    out[afKey] = (out[afKey] ?? 0) + val
  }
  return out
}

/** ESPN fantasy stats -> AF keys for NFL */
export function normalizeEspnNflStats(
  raw: Record<string, number>,
): Record<string, number> {
  const map: Record<string, string> = {
    passing_yards:           'passing_yards',
    passing_touchdowns:      'passing_td',
    passing_interceptions:   'interception_thrown',
    rushing_yards:           'rushing_yards',
    rushing_touchdowns:      'rushing_td',
    receiving_receptions:    'reception',
    receiving_yards:         'receiving_yards',
    receiving_touchdowns:    'receiving_td',
    fumbles_lost:            'fumble_lost',
  }
  const out: Record<string, number> = {}
  for (const [raw_key, val] of Object.entries(raw)) {
    const afKey = map[raw_key] ?? raw_key
    out[afKey] = (out[afKey] ?? 0) + val
  }
  return out
}

// ---------------------------------------------------------------------------
// Batch calculation helpers
// ---------------------------------------------------------------------------

/**
 * Calculate total fantasy points for a roster (array of player stat lines).
 */
export function calculateRosterTotal(
  sport: SupportedSport,
  playerStats: Array<Record<string, number>>,
  rules: Record<string, number>,
): number {
  return playerStats.reduce(
    (sum, stats) => sum + calculateFantasyPoints(sport, stats, rules),
    0,
  )
}

/**
 * Given a head-to-head matchup (two rosters), return points for each side.
 */
export function calculateMatchupPoints(
  sport: SupportedSport,
  homeStats: Array<Record<string, number>>,
  awayStats: Array<Record<string, number>>,
  rules: Record<string, number>,
): { homePoints: number; awayPoints: number } {
  return {
    homePoints: calculateRosterTotal(sport, homeStats, rules),
    awayPoints: calculateRosterTotal(sport, awayStats, rules),
  }
}

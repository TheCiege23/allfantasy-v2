/**
 * Sport-aware stat key normalization for the schedule/stats pipeline.
 * Maps provider/feed stat keys to canonical keys used by ScoringDefaultsRegistry and FantasyPointCalculator.
 */
import type { SportType } from '@/lib/scoring-defaults/types'

/** Common provider aliases -> canonical stat key. */
const NFL_ALIASES: Record<string, string> = {
  pass_yd: 'passing_yards',
  pass_yards: 'passing_yards',
  pass_td: 'passing_td',
  pass_int: 'interception',
  int: 'interception',
  rush_yd: 'rushing_yards',
  rush_yards: 'rushing_yards',
  rush_td: 'rushing_td',
  rec: 'receptions',
  rec_yd: 'receiving_yards',
  rec_yards: 'receiving_yards',
  rec_td: 'receiving_td',
  fumble: 'fumble_lost',
  fumbles_lost: 'fumble_lost',
  fgm_0_39: 'fg_0_39',
  fgm_40_49: 'fg_40_49',
  fgm_50: 'fg_50_plus',
  xpm: 'pat_made',
  xpmiss: 'pat_missed',
  sack: 'dst_sack',
  pa_0: 'dst_points_allowed_0',
  pa_1_6: 'dst_points_allowed_1_6',
  pa_7_13: 'dst_points_allowed_7_13',
  pa_14_20: 'dst_points_allowed_14_20',
  pa_21_27: 'dst_points_allowed_21_27',
  pa_28_34: 'dst_points_allowed_28_34',
  pa_35: 'dst_points_allowed_35_plus',
}

/**
 * IDP aliases normalize provider keys to canonical IDP keys used in scoring templates.
 * Keep ambiguous keys (e.g. sack, interception, safety) off this map to avoid collisions with offense/DST keys.
 */
const NFL_IDP_ALIASES: Record<string, string> = {
  solo_tackle: 'idp_solo_tackle',
  assist_tackle: 'idp_assist_tackle',
  tackle_for_loss: 'idp_tackle_for_loss',
  qb_hit: 'idp_qb_hit',
  pass_defended: 'idp_pass_defended',
  forced_fumble: 'idp_forced_fumble',
  fumble_recovery: 'idp_fumble_recovery',
  defensive_touchdown: 'idp_defensive_touchdown',
  idp_touchdown: 'idp_defensive_touchdown',
  def_td: 'idp_defensive_touchdown',
  def_sack: 'idp_sack',
  def_interception: 'idp_interception',
  def_safety: 'idp_safety',
}

const NBA_ALIASES: Record<string, string> = {
  pts: 'points',
  reb: 'rebounds',
  ast: 'assists',
  stl: 'steals',
  blk: 'blocks',
  to: 'turnovers',
  turnovers: 'turnovers',
  '3pm': 'three_pointers_made',
  threes_made: 'three_pointers_made',
  dd: 'double_double',
  td: 'triple_double',
}

const MLB_ALIASES: Record<string, string> = {
  '1b': 'single',
  '2b': 'double',
  '3b': 'triple',
  hr: 'home_run',
  home_runs: 'home_run',
  rbi_total: 'rbi',
  sb: 'stolen_base',
  steals: 'stolen_base',
  ip: 'innings_pitched',
  innings: 'innings_pitched',
  k: 'strikeouts_pitched',
  so: 'strikeouts_pitched',
  ks: 'strikeouts_pitched',
  er: 'earned_runs',
  sv: 'save',
  saves: 'save',
  hld: 'hold',
  holds: 'hold',
  w: 'win',
  l: 'loss',
  qs: 'quality_start',
  hbp: 'hit_by_pitch',
}

const NHL_ALIASES: Record<string, string> = {
  g: 'goal',
  a: 'assist',
  assists: 'assist',
  goals: 'goal',
  sog: 'shot_on_goal',
  shots: 'shot_on_goal',
  ppp: 'power_play_point',
  ppa: 'power_play_point',
  pp_points: 'power_play_point',
  shp: 'short_handed_point',
  blk: 'blocked_shot',
  blocks: 'blocked_shot',
  sv: 'save',
  saves: 'save',
  ga: 'goal_allowed',
  goals_against: 'goal_allowed',
  w: 'win',
  l: 'loss',
  so: 'shutout',
  shutout: 'shutout',
}

const SOCCER_ALIASES: Record<string, string> = {
  goals: 'goal',
  assists: 'assist',
  sot: 'shot_on_target',
  shots: 'shot',
  kp: 'key_pass',
  cs: 'clean_sheet',
  gc: 'goal_conceded',
  conceded: 'goal_conceded',
  ga: 'goal_allowed',
  goals_allowed: 'goal_allowed',
  mins: 'minutes_played',
  minutes: 'minutes_played',
  yc: 'yellow_card',
  rc: 'red_card',
  og: 'own_goal',
  pen_save: 'penalty_save',
  pen_miss: 'penalty_miss',
}

const SPORT_ALIASES: Record<string, Record<string, string>> = {
  NFL: { ...NFL_ALIASES, ...NFL_IDP_ALIASES },
  NCAAF: NFL_ALIASES,
  NBA: NBA_ALIASES,
  NCAAB: NBA_ALIASES,
  MLB: MLB_ALIASES,
  NHL: NHL_ALIASES,
  SOCCER: SOCCER_ALIASES,
}

/**
 * Normalize a raw stat payload to canonical stat keys for a sport.
 * Unknown keys are passed through as-is so canonical keys need no mapping.
 */
export function normalizeStatPayload(
  sportType: SportType | string,
  rawPayload: Record<string, number>
): Record<string, number> {
  const sport = (sportType as string).toUpperCase()
  const aliases = SPORT_ALIASES[sport] ?? {}
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(rawPayload)) {
    if (typeof value !== 'number' || Number.isNaN(value)) continue
    const canonical = aliases[key] ?? key
    out[canonical] = (out[canonical] ?? 0) + value
  }
  return out
}

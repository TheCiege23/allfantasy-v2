/**
 * Registry of default scoring rules per sport and format.
 * Single source for template id, stat keys, point values, multipliers, enabled flags.
 * Used when no DB ScoringTemplate exists; compatible with ScoringTemplateResolver and FantasyPointCalculator.
 * Stat keys are canonical; data providers can map feed fields to these keys (e.g. Soccer goal, shot_on_target; IDP idp_sack, idp_solo_tackle).
 */
import type { SportType, ScoringRuleDefinition, ScoringTemplateDefinition } from './types'

function rule(
  statKey: string,
  pointsValue: number,
  multiplier: number = 1,
  enabled: boolean = true
): ScoringRuleDefinition {
  return { statKey, pointsValue, multiplier, enabled }
}

/** NFL: PPR (default), Half-PPR, Standard — plus K and DST. */
const NFL_PPR: ScoringRuleDefinition[] = [
  rule('passing_yards', 0.04),
  rule('passing_td', 4),
  rule('interception', -2),
  rule('rushing_yards', 0.1),
  rule('rushing_td', 6),
  rule('receptions', 1),
  rule('receiving_yards', 0.1),
  rule('receiving_td', 6),
  rule('fumble_lost', -2),
  rule('two_pt_conversion', 2),
  rule('passing_2pt', 2),
  rule('rushing_2pt', 2),
  rule('receiving_2pt', 2),
  rule('fg_0_39', 3),
  rule('fg_40_49', 4),
  rule('fg_50_plus', 5),
  rule('pat_made', 1),
  rule('pat_missed', -1),
  rule('dst_sack', 1),
  rule('dst_interception', 2),
  rule('dst_fumble_recovery', 2),
  rule('dst_td', 6),
  rule('dst_safety', 2),
  rule('dst_blocked_kick', 2),
  rule('dst_return_td', 6),
  rule('dst_points_allowed_0', 10),
  rule('dst_points_allowed_1_6', 7),
  rule('dst_points_allowed_7_13', 4),
  rule('dst_points_allowed_14_20', 1),
  rule('dst_points_allowed_21_27', 0),
  rule('dst_points_allowed_28_34', -1),
  rule('dst_points_allowed_35_plus', -4),
]

const NFL_HALF_PPR: ScoringRuleDefinition[] = NFL_PPR.map((r) =>
  r.statKey === 'receptions' ? { ...r, pointsValue: 0.5 } : r
)

const NFL_STANDARD: ScoringRuleDefinition[] = NFL_PPR.map((r) =>
  r.statKey === 'receptions' ? { ...r, pointsValue: 0, enabled: true } : r
)

/** NBA: points scoring. */
const NBA_POINTS: ScoringRuleDefinition[] = [
  rule('points', 1),
  rule('rebounds', 1.2),
  rule('assists', 1.5),
  rule('steals', 3),
  rule('blocks', 3),
  rule('turnovers', -1),
  rule('three_pointers_made', 0.5),
  rule('double_double', 1.5),
  rule('triple_double', 3),
]

/** MLB: standard (batter + pitcher). */
const MLB_STANDARD: ScoringRuleDefinition[] = [
  rule('single', 1),
  rule('double', 2),
  rule('triple', 3),
  rule('home_run', 4),
  rule('rbi', 1),
  rule('run', 1),
  rule('walk', 1),
  rule('stolen_base', 2),
  rule('hit_by_pitch', 1),
  rule('strikeout', -0.5),
  rule('innings_pitched', 3),
  rule('earned_runs', -2),
  rule('strikeouts_pitched', 1),
  rule('save', 5),
  rule('hold', 4),
  rule('win', 5),
  rule('loss', -5),
  rule('quality_start', 4),
]

/** NHL: standard. */
const NHL_STANDARD: ScoringRuleDefinition[] = [
  rule('goal', 3),
  rule('assist', 2),
  rule('shot_on_goal', 0.5),
  rule('blocked_shot', 0.5),
  rule('power_play_point', 1),
  rule('short_handed_point', 2),
  rule('save', 0.6),
  rule('goal_allowed', -3),
  rule('win', 5),
  rule('loss', -3),
  rule('shutout', 3),
]

/** NCAA Football: PPR-style, configurable (same stat keys as NFL). */
const NCAAF_PPR: ScoringRuleDefinition[] = [
  ...NFL_PPR.filter(
    (r) =>
      !r.statKey.startsWith('dst_') &&
      !r.statKey.startsWith('fg_') &&
      r.statKey !== 'pat_made' &&
      r.statKey !== 'pat_missed'
  ),
  rule('fg_0_39', 3),
  rule('fg_40_49', 4),
  rule('fg_50_plus', 5),
  rule('pat_made', 1),
  rule('pat_missed', -1),
  rule('dst_sack', 1),
  rule('dst_interception', 2),
  rule('dst_fumble_recovery', 2),
  rule('dst_td', 6),
  rule('dst_safety', 2),
  rule('dst_blocked_kick', 2),
  rule('dst_return_td', 6),
  rule('dst_points_allowed_0', 10),
  rule('dst_points_allowed_1_6', 7),
  rule('dst_points_allowed_7_13', 4),
  rule('dst_points_allowed_14_20', 1),
  rule('dst_points_allowed_21_27', 0),
  rule('dst_points_allowed_28_34', -1),
  rule('dst_points_allowed_35_plus', -4),
]

/** NCAA Basketball: points (same stat keys as NBA). */
const NCAAB_POINTS: ScoringRuleDefinition[] = [...NBA_POINTS]

/** Soccer: standard (goals, assists, clean sheet, shots, cards, etc.). Stat keys map to provider feeds. */
const SOCCER_STANDARD: ScoringRuleDefinition[] = [
  rule('goal', 6),
  rule('assist', 3),
  rule('shot_on_target', 0.5),
  rule('shot', 0.2),
  rule('key_pass', 0.5),
  rule('clean_sheet', 4),
  rule('goal_conceded', -1),
  rule('goal_allowed', -1),
  rule('save', 0.5),
  rule('penalty_save', 5),
  rule('penalty_miss', -2),
  rule('yellow_card', -1),
  rule('red_card', -3),
  rule('own_goal', -2),
  rule('minutes_played', 0.02),
]

/** NFL IDP: offensive rules + IDP (tackles, sacks, INT, etc.). Coexists with standard NFL templates. */
const NFL_IDP_RULES: ScoringRuleDefinition[] = [
  ...NFL_PPR,
  rule('idp_tackle_solo', 1),
  rule('idp_tackle_assist', 0.5),
  rule('idp_solo_tackle', 1),
  rule('idp_assist_tackle', 0.5),
  rule('idp_tackle_for_loss', 2),
  rule('idp_qb_hit', 1),
  rule('idp_sack', 4),
  rule('idp_interception', 3),
  rule('idp_pass_defended', 1),
  rule('idp_forced_fumble', 3),
  rule('idp_fumble_recovery', 2),
  rule('idp_td', 6),
  rule('idp_defensive_touchdown', 6),
  rule('idp_safety', 2),
  rule('idp_blocked_kick', 2),
]

const REGISTRY: Record<
  string,
  { name: string; rules: ScoringRuleDefinition[] }
> = {
  'NFL-PPR': { name: 'Default NFL PPR', rules: NFL_PPR },
  'NFL-Half PPR': { name: 'Default NFL Half PPR', rules: NFL_HALF_PPR },
  'NFL-half_ppr': { name: 'Default NFL Half PPR', rules: NFL_HALF_PPR },
  'NFL-Standard': { name: 'Default NFL Standard', rules: NFL_STANDARD },
  'NFL-standard': { name: 'Default NFL Standard', rules: NFL_STANDARD },
  'NBA-points': { name: 'Default NBA Points', rules: NBA_POINTS },
  'NBA-standard': { name: 'Default NBA Points', rules: NBA_POINTS },
  'MLB-standard': { name: 'Default MLB Standard', rules: MLB_STANDARD },
  'NHL-standard': { name: 'Default NHL Standard', rules: NHL_STANDARD },
  'NCAAF-PPR': { name: 'Default NCAA Football PPR', rules: NCAAF_PPR },
  'NCAAF-standard': { name: 'Default NCAA Football PPR', rules: NCAAF_PPR },
  'NCAAB-points': { name: 'Default NCAA Basketball Points', rules: NCAAB_POINTS },
  'NCAAB-standard': { name: 'Default NCAA Basketball Points', rules: NCAAB_POINTS },
  'SOCCER-standard': { name: 'Default Soccer Standard', rules: SOCCER_STANDARD },
  'NFL-IDP': { name: 'Default NFL IDP', rules: NFL_IDP_RULES },
  'NFL-idp': { name: 'Default NFL IDP', rules: NFL_IDP_RULES },
}

function toSportType(s: string): SportType {
  const u = s.toUpperCase()
  if (u === 'NFL' || u === 'NBA' || u === 'MLB' || u === 'NHL' || u === 'NCAAF' || u === 'NCAAB' || u === 'SOCCER')
    return u as SportType
  return 'NFL'
}

/**
 * Get default scoring template definition for a sport and format (in-memory only).
 */
export function getDefaultScoringTemplate(
  sportType: SportType | string,
  formatType: string = 'standard'
): ScoringTemplateDefinition {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)
  const format = formatType || 'standard'
  const key = `${sport}-${format}`
  let fallbackKey = `${sport}-standard`
  if (sport === 'NFL') fallbackKey = format === 'IDP' || format === 'idp' ? 'NFL-IDP' : 'NFL-PPR'
  else if (sport === 'NBA' || sport === 'NCAAB') fallbackKey = `${sport}-points`
  else if (sport === 'SOCCER') fallbackKey = 'SOCCER-standard'
  const entry = REGISTRY[key] ?? REGISTRY[fallbackKey] ?? REGISTRY['NFL-PPR']
  const templateId = `default-${sport}-${format}`
  return {
    templateId,
    sportType: sport as SportType,
    name: entry.name,
    formatType: format,
    rules: entry.rules,
  }
}

/**
 * Get default scoring rules only (for merging or display).
 */
export function getDefaultScoringRules(
  sportType: SportType | string,
  formatType: string = 'standard'
): ScoringRuleDefinition[] {
  return getDefaultScoringTemplate(sportType, formatType).rules
}

/**
 * Registry of default scoring rules per sport and format.
 * Single source for template id, stat keys, point values, multipliers, enabled flags.
 * Used when no DB ScoringTemplate exists; compatible with ScoringTemplateResolver and FantasyPointCalculator.
 * Stat keys are canonical; data providers can map feed fields to these keys (e.g. Soccer goal, shot_on_target; IDP idp_sack, idp_solo_tackle).
 */
import { DEFAULT_SPORT } from '@/lib/sport-scope'
import type { SportType, ScoringRuleDefinition, ScoringTemplateDefinition } from './types'

export interface LeagueSettingsForScoringDefaults {
  scoring_format?: string | null
  leagueVariant?: string | null
  idpScoringPreset?: string | null
  [key: string]: unknown
}

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

/** NFL TE Premium: 1.5 PPR (often used as proxy for TE-only premium when engine has single receptions stat). */
const NFL_TE_PREMIUM: ScoringRuleDefinition[] = NFL_PPR.map((r) =>
  r.statKey === 'receptions' ? { ...r, pointsValue: 1.5 } : r
)

/** Dynasty 6pt pass TD variant (Full PPR, 6pt passing TD). */
const NFL_6PT_PASS_TD: ScoringRuleDefinition[] = NFL_PPR.map((r) =>
  r.statKey === 'passing_td' ? { ...r, pointsValue: 6 } : r
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

/**
 * Soccer: default scoring template. Stat keys are canonical; data providers map feed fields to these keys.
 * Keys: goal, assist, shot_on_target, shot, key_pass, clean_sheet, goal_conceded, goal_allowed, save,
 * penalty_save, penalty_miss, yellow_card, red_card, own_goal, minutes_played.
 */
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

/**
 * NFL IDP: offensive (NFL PPR) + defensive scoring. Coexists with standard NFL templates.
 * IDP stat keys use idp_ prefix to avoid clash with offensive stats. Map feed fields to:
 * idp_solo_tackle, idp_assist_tackle, idp_tackle_for_loss, idp_qb_hit, idp_sack, idp_interception,
 * idp_pass_defended, idp_forced_fumble, idp_fumble_recovery, idp_defensive_touchdown, idp_safety, idp_blocked_kick.
 */
/** NFL IDP Balanced: solo/assist meaningful, sack/INT strong, PD moderate, FF/FR/defensive TD/safety high. */
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

/** Tackle-heavy: emphasize solo and assist tackles; big plays still count but do not dominate. */
const NFL_IDP_TACKLE_HEAVY: ScoringRuleDefinition[] = [
  ...NFL_PPR,
  rule('idp_solo_tackle', 1.5),
  rule('idp_assist_tackle', 0.75),
  rule('idp_tackle_solo', 1.5),
  rule('idp_tackle_assist', 0.75),
  rule('idp_tackle_for_loss', 1.5),
  rule('idp_qb_hit', 0.5),
  rule('idp_sack', 3),
  rule('idp_interception', 2),
  rule('idp_pass_defended', 0.5),
  rule('idp_forced_fumble', 2),
  rule('idp_fumble_recovery', 1),
  rule('idp_defensive_touchdown', 4),
  rule('idp_td', 4),
  rule('idp_safety', 1.5),
  rule('idp_blocked_kick', 1.5),
]

/** Big-play-heavy: sacks, INT, FF, FR, TDs carry stronger weight; tackles still count but less dominant. */
const NFL_IDP_BIG_PLAY: ScoringRuleDefinition[] = [
  ...NFL_PPR,
  rule('idp_solo_tackle', 0.5),
  rule('idp_assist_tackle', 0.25),
  rule('idp_tackle_solo', 0.5),
  rule('idp_tackle_assist', 0.25),
  rule('idp_tackle_for_loss', 3),
  rule('idp_qb_hit', 1.5),
  rule('idp_sack', 5),
  rule('idp_interception', 5),
  rule('idp_pass_defended', 1.5),
  rule('idp_forced_fumble', 4),
  rule('idp_fumble_recovery', 3),
  rule('idp_defensive_touchdown', 8),
  rule('idp_td', 8),
  rule('idp_safety', 4),
  rule('idp_blocked_kick', 3),
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
  'NFL-IDP': { name: 'Default NFL IDP (Balanced)', rules: NFL_IDP_RULES },
  'NFL-idp': { name: 'Default NFL IDP (Balanced)', rules: NFL_IDP_RULES },
  'NFL-IDP-balanced': { name: 'NFL IDP Balanced', rules: NFL_IDP_RULES },
  'NFL-IDP-tackle_heavy': { name: 'NFL IDP Tackle-Heavy', rules: NFL_IDP_TACKLE_HEAVY },
  'NFL-IDP-big_play_heavy': { name: 'NFL IDP Big-Play-Heavy', rules: NFL_IDP_BIG_PLAY },
  'NFL-ppr': { name: 'Default NFL PPR', rules: NFL_PPR },
  'NFL-TE_PREMIUM': { name: 'NFL TE Premium', rules: NFL_TE_PREMIUM },
  'NFL-dynasty_6pt_pass_td': { name: 'Dynasty 6pt Pass TD', rules: NFL_6PT_PASS_TD },
}

function toSportType(s: string): SportType {
  const u = s.toUpperCase()
  if (u === 'NFL' || u === 'NBA' || u === 'MLB' || u === 'NHL' || u === 'NCAAF' || u === 'NCAAB' || u === 'SOCCER')
    return u as SportType
  return DEFAULT_SPORT as SportType
}

/**
 * Normalize format string for registry lookup (case-insensitive and common aliases).
 */
function normalizeFormatForLookup(sport: SportType, format: string): string {
  const f = (format || 'standard').trim()
  const lower = f.toLowerCase()
  if (sport === 'NFL') {
    if (lower === 'idp-balanced' || lower === 'idp_balanced') return 'IDP-balanced'
    if (lower === 'idp-tackle_heavy' || lower === 'idp_tackle_heavy') return 'IDP-tackle_heavy'
    if (lower === 'idp-big_play_heavy' || lower === 'idp_big_play_heavy') return 'IDP-big_play_heavy'
    if (lower === 'idp' || lower === 'dynasty_idp') return 'IDP'
    if (lower === 'ppr') return 'PPR'
    if (lower === 'half_ppr' || lower === 'half ppr') return 'half_ppr'
    if (lower === 'standard') return 'standard'
    if (lower === 'dynasty_standard') return 'standard'
    if (lower === 'dynasty_half_ppr') return 'half_ppr'
    if (lower === 'dynasty_full_ppr' || lower === 'dynasty_superflex_default') return 'PPR'
    if (lower === 'dynasty_full_ppr_tep') return 'TE_PREMIUM'
    if (lower === 'dynasty_6pt_pass_td') return 'dynasty_6pt_pass_td'
  }
  if ((sport === 'NBA' || sport === 'NCAAB') && (lower === 'points' || lower === 'standard')) return 'points'
  if (sport === 'SOCCER' && lower === 'standard') return 'standard'
  if ((sport === 'MLB' || sport === 'NHL' || sport === 'NCAAF') && lower === 'standard') return 'standard'
  if (sport === 'NCAAF' && (lower === 'ppr' || lower === 'standard')) return 'PPR'
  return f
}

/**
 * Get default scoring template definition for a sport and format (in-memory only).
 * Resolved by sport_type, format_type; league_settings can supply format_type when calling from resolvers.
 */
export function getDefaultScoringTemplate(
  sportType: SportType | string,
  formatType: string = 'standard'
): ScoringTemplateDefinition {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)
  const format = normalizeFormatForLookup(sport, formatType || 'standard')
  const key = `${sport}-${format}`
  let fallbackKey = `${sport}-standard`
  if (sport === 'NFL') {
    if (format === 'IDP' || format === 'IDP-balanced') fallbackKey = 'NFL-IDP'
    else if (format === 'IDP-tackle_heavy') fallbackKey = 'NFL-IDP-tackle_heavy'
    else if (format === 'IDP-big_play_heavy') fallbackKey = 'NFL-IDP-big_play_heavy'
    else if (format !== 'IDP') fallbackKey = 'NFL-PPR'
  }
  else if (sport === 'NBA' || sport === 'NCAAB') fallbackKey = `${sport}-points`
  else if (sport === 'SOCCER') fallbackKey = 'SOCCER-standard'
  else if (sport === 'NCAAF') fallbackKey = 'NCAAF-PPR'
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
 * Resolve default scoring template by sport + optional format + league settings.
 * Resolution order: explicit formatType > league settings (IDP presets, scoring_format) > sport default format.
 */
export function resolveDefaultScoringTemplate(
  sportType: SportType | string,
  options?: {
    formatType?: string | null
    leagueSettings?: LeagueSettingsForScoringDefaults | null
  }
): ScoringTemplateDefinition {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)
  const explicitFormat = options?.formatType?.trim()
  if (explicitFormat) {
    return getDefaultScoringTemplate(sport, explicitFormat)
  }

  const leagueSettings = options?.leagueSettings ?? null
  if (leagueSettings) {
    const variant = String(leagueSettings.leagueVariant ?? '').toUpperCase()
    if (sport === 'NFL' && (variant === 'IDP' || variant === 'DYNASTY_IDP')) {
      const preset = String(leagueSettings.idpScoringPreset ?? '').toLowerCase()
      if (preset === 'tackle_heavy') return getDefaultScoringTemplate(sport, 'IDP-tackle_heavy')
      if (preset === 'big_play_heavy') return getDefaultScoringTemplate(sport, 'IDP-big_play_heavy')
      return getDefaultScoringTemplate(sport, 'IDP-balanced')
    }

    const scoringFormat =
      typeof leagueSettings.scoring_format === 'string' ? leagueSettings.scoring_format.trim() : ''
    if (scoringFormat) {
      return getDefaultScoringTemplate(sport, scoringFormat)
    }
  }

  if (sport === 'NFL') return getDefaultScoringTemplate(sport, 'PPR')
  if (sport === 'NBA' || sport === 'NCAAB') return getDefaultScoringTemplate(sport, 'points')
  if (sport === 'NCAAF') return getDefaultScoringTemplate(sport, 'PPR')
  return getDefaultScoringTemplate(sport, 'standard')
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

/**
 * Build a short scoring context string for AI recommendations (draft, waiver, matchup summary).
 * Includes template name and a few key rules so AI can reason about scoring impact.
 */
export function getScoringContextForAI(
  sportType: SportType | string,
  formatType: string = 'standard'
): string {
  const template = getDefaultScoringTemplate(sportType, formatType)
  const topRules = template.rules
    .filter((r) => r.enabled && r.pointsValue !== 0)
    .slice(0, 12)
    .map((r) => `${r.statKey}: ${r.pointsValue > 0 ? '+' : ''}${r.pointsValue}`)
  return `Scoring: ${template.name}. Key rules: ${topRules.join(', ')}.`
}

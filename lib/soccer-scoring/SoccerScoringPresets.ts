/**
 * [NEW] lib/soccer-scoring/SoccerScoringPresets.ts
 * Soccer scoring presets: AF Default, FPL-Compatible, ESPN-Compatible, Yahoo-Compatible.
 * Covers Attacking, Defending, Goalkeeping, Discipline, and Bonus categories.
 * Note: FPL (Fantasy Premier League) is the dominant soccer fantasy platform globally.
 * ESPN/Yahoo offer limited soccer fantasy; presets are compatibility baselines.
 */

export type SoccerScoringPresetKey = 'af_default' | 'fpl_compatible' | 'espn_compatible' | 'yahoo_compatible' | 'custom'
export type SoccerScoringSource = 'AF_DEFAULT' | 'PLATFORM_PRESET' | 'IMPORTED_EXACT' | 'IMPORTED_MAPPED' | 'CUSTOM'

export interface SoccerScoringPreset {
  key: SoccerScoringPresetKey
  label: string
  source: SoccerScoringSource
  description: string
  warning?: string
  rules: Record<string, number>
}

export const SOCCER_ATTACKING_KEYS = [
  'goal', 'assist', 'shot_on_target', 'shot', 'key_pass', 'big_chance_created',
  'through_ball', 'dribble_success', 'cross_accurate',
  'penalty_scored', 'penalty_missed', 'hat_trick_bonus',
] as const

export const SOCCER_DEFENDING_KEYS = [
  'clean_sheet', 'goal_conceded', 'tackle_won', 'interception', 'clearance',
  'blocked_shot', 'aerial_won', 'own_goal',
] as const

export const SOCCER_GOALKEEPING_KEYS = [
  'gk_save', 'gk_penalty_save', 'gk_goals_against', 'gk_clean_sheet',
  'gk_high_claim', 'gk_punch', 'gk_save_inside_box',
] as const

export const SOCCER_DISCIPLINE_KEYS = [
  'yellow_card', 'red_card', 'foul_committed', 'foul_drawn', 'offside',
] as const

export const SOCCER_GENERAL_KEYS = [
  'minutes_played', 'appearance', 'sub_on', 'sub_off',
  'man_of_match', 'rating_bonus_7plus', 'rating_bonus_8plus',
] as const

export const SOCCER_STAT_KEYS = [
  ...SOCCER_ATTACKING_KEYS, ...SOCCER_DEFENDING_KEYS, ...SOCCER_GOALKEEPING_KEYS,
  ...SOCCER_DISCIPLINE_KEYS, ...SOCCER_GENERAL_KEYS,
] as const

export type SoccerStatKey = (typeof SOCCER_STAT_KEYS)[number]

export const SOCCER_STAT_LABELS: Record<string, string> = {
  goal: 'Goal', assist: 'Assist', shot_on_target: 'Shot on Target', shot: 'Shot',
  key_pass: 'Key Pass', big_chance_created: 'Big Chance Created', through_ball: 'Through Ball',
  dribble_success: 'Successful Dribble', cross_accurate: 'Accurate Cross',
  penalty_scored: 'Penalty Scored', penalty_missed: 'Penalty Missed', hat_trick_bonus: 'Hat Trick Bonus',
  clean_sheet: 'Clean Sheet (DEF/MID)', goal_conceded: 'Goal Conceded', tackle_won: 'Tackle Won',
  interception: 'Interception', clearance: 'Clearance', blocked_shot: 'Blocked Shot',
  aerial_won: 'Aerial Won', own_goal: 'Own Goal',
  gk_save: 'Save (GK)', gk_penalty_save: 'Penalty Save (GK)', gk_goals_against: 'Goals Against (GK)',
  gk_clean_sheet: 'Clean Sheet (GK)', gk_high_claim: 'High Claim (GK)', gk_punch: 'Punch (GK)',
  gk_save_inside_box: 'Save Inside Box (GK)',
  yellow_card: 'Yellow Card', red_card: 'Red Card', foul_committed: 'Foul Committed',
  foul_drawn: 'Foul Drawn', offside: 'Offside',
  minutes_played: 'Minutes Played', appearance: 'Appearance', sub_on: 'Sub On', sub_off: 'Sub Off',
  man_of_match: 'Man of the Match', rating_bonus_7plus: 'Rating 7.0+ Bonus', rating_bonus_8plus: 'Rating 8.0+ Bonus',
}

const AF_DEFAULT: SoccerScoringPreset = {
  key: 'af_default', label: 'AllFantasy Default', source: 'AF_DEFAULT',
  description: 'Balanced soccer scoring optimized for AllFantasy league types. Rewards goals, assists, clean sheets, and defensive contributions.',
  rules: {
    goal: 6, assist: 3, shot_on_target: 0.5, shot: 0.2, key_pass: 0.5,
    penalty_scored: 6, penalty_missed: -2, hat_trick_bonus: 3,
    clean_sheet: 4, goal_conceded: -1, tackle_won: 0.3, interception: 0.3,
    own_goal: -2, minutes_played: 0.02,
    gk_save: 0.5, gk_penalty_save: 5, gk_goals_against: -1, gk_clean_sheet: 4,
    yellow_card: -1, red_card: -3,
  },
}

const FPL_COMPATIBLE: SoccerScoringPreset = {
  key: 'fpl_compatible', label: 'FPL-Compatible', source: 'PLATFORM_PRESET',
  description: 'Fantasy Premier League compatible scoring. Based on FPL\'s well-known points structure with position-agnostic point values.',
  warning: 'This preset is based on FPL scoring conventions. FPL awards different goal points by position (GK/DEF=6, MID=5, FWD=4) which is simplified here. Specialty leagues are optimized for AllFantasy scoring.',
  rules: {
    goal: 5, assist: 3, clean_sheet: 4, goal_conceded: -0.5,
    penalty_missed: -2, own_goal: -2, yellow_card: -1, red_card: -3,
    gk_save: 0.33, gk_penalty_save: 5, gk_clean_sheet: 4, gk_goals_against: -0.5,
    minutes_played: 0.01, appearance: 1,
  },
}

const ESPN_COMPATIBLE: SoccerScoringPreset = {
  key: 'espn_compatible', label: 'ESPN-Compatible', source: 'PLATFORM_PRESET',
  description: 'ESPN-compatible soccer scoring baseline for points leagues.',
  warning: 'ESPN offers limited soccer fantasy support. This is a compatible baseline. Specialty leagues are optimized for AllFantasy scoring.',
  rules: {
    goal: 5, assist: 3, shot_on_target: 1, clean_sheet: 4,
    goal_conceded: -1, yellow_card: -1, red_card: -3,
    gk_save: 0.5, gk_penalty_save: 5, gk_clean_sheet: 4,
    penalty_missed: -2, own_goal: -2,
  },
}

const YAHOO_COMPATIBLE: SoccerScoringPreset = {
  key: 'yahoo_compatible', label: 'Yahoo-Compatible', source: 'PLATFORM_PRESET',
  description: 'Yahoo-compatible soccer scoring baseline.',
  warning: 'Yahoo offers limited soccer fantasy support. This is a compatible baseline. Specialty leagues are optimized for AllFantasy scoring.',
  rules: {
    goal: 5, assist: 3, shot_on_target: 0.5, clean_sheet: 4,
    goal_conceded: -1, yellow_card: -1, red_card: -3,
    gk_save: 0.5, gk_penalty_save: 5, gk_clean_sheet: 4,
    penalty_missed: -2, own_goal: -2, minutes_played: 0.02,
  },
}

const PRESET_REGISTRY: Record<SoccerScoringPresetKey, SoccerScoringPreset> = {
  af_default: AF_DEFAULT, fpl_compatible: FPL_COMPATIBLE,
  espn_compatible: ESPN_COMPATIBLE, yahoo_compatible: YAHOO_COMPATIBLE,
  custom: { key: 'custom', label: 'Custom', source: 'CUSTOM', description: 'Custom scoring values.', rules: { ...AF_DEFAULT.rules } },
}

export function getSoccerScoringPresets(): SoccerScoringPreset[] { return Object.values(PRESET_REGISTRY) }
export function getSoccerScoringPreset(key: SoccerScoringPresetKey): SoccerScoringPreset { return PRESET_REGISTRY[key] ?? PRESET_REGISTRY.af_default }

export function detectSoccerPresetMatch(rules: Record<string, number>): SoccerScoringPresetKey | null {
  for (const preset of [AF_DEFAULT, FPL_COMPATIBLE, ESPN_COMPATIBLE, YAHOO_COMPATIBLE]) {
    const keys = Object.keys(preset.rules)
    const nonZero = Object.entries(rules).filter(([, v]) => v !== 0)
    if (nonZero.length !== keys.length) continue
    if (keys.every((k) => Math.abs((rules[k] ?? 0) - (preset.rules[k] ?? 0)) < 0.001)) return preset.key
  }
  return null
}

export function buildFullSoccerScoringConfig(presetKey: SoccerScoringPresetKey): Record<string, number> {
  const preset = getSoccerScoringPreset(presetKey)
  const config: Record<string, number> = {}
  for (const key of SOCCER_STAT_KEYS) config[key] = preset.rules[key] ?? 0
  return config
}

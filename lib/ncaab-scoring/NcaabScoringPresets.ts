/**
 * [NEW] lib/ncaab-scoring/NcaabScoringPresets.ts
 * NCAAB scoring presets: AF Default, Sleeper-Compatible, ESPN-Compatible, Yahoo-Compatible.
 * Note: Sleeper/ESPN/Yahoo do not offer dedicated NCAAB fantasy products,
 * so all external presets are labeled as "compatible" baselines.
 */

export type NcaabScoringPresetKey = 'af_default' | 'sleeper_compatible' | 'espn_compatible' | 'yahoo_compatible' | 'custom'
export type NcaabScoringSource = 'AF_DEFAULT' | 'PLATFORM_PRESET' | 'IMPORTED_EXACT' | 'IMPORTED_MAPPED' | 'CUSTOM'

export interface NcaabScoringPreset {
  key: NcaabScoringPresetKey
  label: string
  source: NcaabScoringSource
  description: string
  warning?: string
  rules: Record<string, number>
}

export const NCAAB_STAT_KEYS = [
  // General
  'points_scored', 'minutes_played', 'plus_minus',
  // Shooting
  'field_goals_made', 'field_goals_attempted', 'field_goals_missed',
  'two_point_made', 'two_point_attempted', 'two_point_missed',
  // Free Throws
  'free_throws_made', 'free_throws_attempted', 'free_throws_missed',
  // Three-Point
  'three_point_made', 'three_point_attempted', 'three_point_missed',
  // Rebounds
  'rebound', 'offensive_rebound', 'defensive_rebound',
  // Playmaking
  'assist', 'turnover',
  // Defense
  'steal', 'block',
  // Discipline
  'personal_foul', 'technical_foul', 'flagrant_foul',
  // Bonuses
  'double_double', 'triple_double',
  'twenty_plus_points_bonus', 'thirty_plus_points_bonus', 'forty_plus_points_bonus',
  'ten_plus_assists_bonus', 'fifteen_plus_rebounds_bonus', 'ten_plus_rebounds_bonus',
  'five_plus_threes_bonus',
  // Advanced (premium)
  'usage_rate_bonus', 'efficiency_bonus', 'tempo_adjusted_bonus', 'assist_turnover_bonus',
] as const

export type NcaabStatKey = (typeof NCAAB_STAT_KEYS)[number]

export const NCAAB_STAT_LABELS: Record<string, string> = {
  // General
  points_scored: 'Points Scored', minutes_played: 'Minutes Played', plus_minus: 'Plus/Minus',
  // Shooting
  field_goals_made: 'Field Goals Made', field_goals_attempted: 'Field Goals Attempted', field_goals_missed: 'Field Goals Missed',
  two_point_made: '2-Point Field Goals Made', two_point_attempted: '2-Point Field Goals Attempted', two_point_missed: '2-Point Field Goals Missed',
  // Free Throws
  free_throws_made: 'Free Throws Made', free_throws_attempted: 'Free Throws Attempted', free_throws_missed: 'Free Throws Missed',
  // Three-Point
  three_point_made: '3-Point Shots Made', three_point_attempted: '3-Point Shots Attempted', three_point_missed: '3-Point Shots Missed',
  // Rebounds
  rebound: 'Rebound', offensive_rebound: 'Offensive Rebound', defensive_rebound: 'Defensive Rebound',
  // Playmaking
  assist: 'Assist', turnover: 'Turnover',
  // Defense
  steal: 'Steal', block: 'Block',
  // Discipline
  personal_foul: 'Personal Foul', technical_foul: 'Technical Foul', flagrant_foul: 'Flagrant Foul',
  // Bonuses
  double_double: 'Double-Double', triple_double: 'Triple-Double',
  twenty_plus_points_bonus: '20+ Points Bonus', thirty_plus_points_bonus: '30+ Points Bonus',
  forty_plus_points_bonus: '40+ Points Bonus',
  ten_plus_assists_bonus: '10+ Assists Bonus', fifteen_plus_rebounds_bonus: '15+ Rebounds Bonus',
  ten_plus_rebounds_bonus: '10+ Rebounds Bonus', five_plus_threes_bonus: '5+ Made 3PT Bonus',
  // Advanced (premium)
  usage_rate_bonus: 'Usage Rate Bonus', efficiency_bonus: 'Efficiency Bonus',
  tempo_adjusted_bonus: 'Tempo-Adjusted Bonus', assist_turnover_bonus: 'Assist-to-Turnover Bonus',
}

const AF_DEFAULT: NcaabScoringPreset = {
  key: 'af_default', label: 'AllFantasy Default', source: 'AF_DEFAULT',
  description: 'Balanced NCAAB scoring optimized for AllFantasy league types including bracket mode and specialty formats.',
  rules: {
    points_scored: 0.5, rebound: 1, assist: 1, steal: 2, block: 2, turnover: -1,
    double_double: 1, triple_double: 2, technical_foul: -2, flagrant_foul: -2,
    personal_foul: -0.5,
    three_point_made: 0.5, twenty_plus_points_bonus: 1, thirty_plus_points_bonus: 2,
  },
}

const SLEEPER_COMPATIBLE: NcaabScoringPreset = {
  key: 'sleeper_compatible', label: 'Sleeper-Compatible', source: 'PLATFORM_PRESET',
  description: 'Sleeper-compatible NCAAB scoring. Sleeper does not offer dedicated college basketball fantasy. This uses a Sleeper-style points structure.',
  warning: 'Sleeper does not currently support NCAAB fantasy leagues. This is a compatibility preset. Specialty leagues are optimized for AllFantasy scoring.',
  rules: {
    points_scored: 1, rebound: 1, assist: 1.5, steal: 3, block: 3, turnover: -1,
    double_double: 1.5, triple_double: 3, three_point_made: 0.5,
  },
}

const ESPN_COMPATIBLE: NcaabScoringPreset = {
  key: 'espn_compatible', label: 'ESPN-Compatible', source: 'PLATFORM_PRESET',
  description: 'ESPN-compatible NCAAB points baseline.',
  warning: 'This is a compatible baseline for ESPN-style scoring. Specialty leagues are optimized for AllFantasy scoring.',
  rules: {
    points_scored: 1, three_point_made: 1,
    field_goals_attempted: -1, field_goals_made: 2,
    free_throws_attempted: -1, free_throws_made: 1,
    rebound: 1, assist: 2, steal: 4, block: 4, turnover: -2,
  },
}

const YAHOO_COMPATIBLE: NcaabScoringPreset = {
  key: 'yahoo_compatible', label: 'Yahoo-Compatible', source: 'PLATFORM_PRESET',
  description: 'Yahoo-compatible NCAAB points baseline.',
  warning: 'This is a compatible baseline for Yahoo-style scoring. Specialty leagues are optimized for AllFantasy scoring.',
  rules: {
    points_scored: 1, rebound: 1.2, assist: 1.5, block: 3, steal: 3, turnover: -1,
  },
}

const PRESET_REGISTRY: Record<NcaabScoringPresetKey, NcaabScoringPreset> = {
  af_default: AF_DEFAULT, sleeper_compatible: SLEEPER_COMPATIBLE,
  espn_compatible: ESPN_COMPATIBLE, yahoo_compatible: YAHOO_COMPATIBLE,
  custom: { key: 'custom', label: 'Custom', source: 'CUSTOM', description: 'Custom scoring values.', rules: { ...AF_DEFAULT.rules } },
}

export function getNcaabScoringPresets(): NcaabScoringPreset[] { return Object.values(PRESET_REGISTRY) }
export function getNcaabScoringPreset(key: NcaabScoringPresetKey): NcaabScoringPreset { return PRESET_REGISTRY[key] ?? PRESET_REGISTRY.af_default }

export function detectNcaabPresetMatch(rules: Record<string, number>): NcaabScoringPresetKey | null {
  for (const preset of [AF_DEFAULT, SLEEPER_COMPATIBLE, ESPN_COMPATIBLE, YAHOO_COMPATIBLE]) {
    const keys = Object.keys(preset.rules)
    const nonZero = Object.entries(rules).filter(([, v]) => v !== 0)
    if (nonZero.length !== keys.length) continue
    if (keys.every((k) => Math.abs((rules[k] ?? 0) - (preset.rules[k] ?? 0)) < 0.001)) return preset.key
  }
  return null
}

export function buildFullNcaabScoringConfig(presetKey: NcaabScoringPresetKey): Record<string, number> {
  const preset = getNcaabScoringPreset(presetKey)
  const config: Record<string, number> = {}
  for (const key of NCAAB_STAT_KEYS) config[key] = preset.rules[key] ?? 0
  return config
}

/**
 * [NEW] lib/mlb-scoring/MlbScoringPresets.ts
 * MLB scoring presets: AllFantasy Default, Sleeper-Compatible, ESPN, Yahoo.
 */

export type MlbScoringPresetKey = 'af_default' | 'sleeper_compatible' | 'espn_default' | 'yahoo_default' | 'custom'
export type MlbScoringSource = 'AF_DEFAULT' | 'PLATFORM_PRESET' | 'IMPORTED_EXACT' | 'IMPORTED_MAPPED' | 'CUSTOM'

export interface MlbScoringPreset {
  key: MlbScoringPresetKey
  label: string
  source: MlbScoringSource
  description: string
  warning?: string
  rules: Record<string, number>
}

// ============================================================
// STAT KEY DEFINITIONS
// ============================================================

export const MLB_HITTING_STAT_KEYS = [
  'plate_appearances', 'at_bats', 'runs', 'singles', 'doubles', 'triples', 'home_runs',
  'total_bases', 'rbis', 'walks', 'intentional_walks', 'hit_by_pitch', 'strikeouts',
  'stolen_bases', 'caught_stealing', 'sacrifice_flies', 'sacrifice_bunts',
  'ground_into_double_play', 'cycle_bonus', 'grand_slam_bonus', 'game_winning_rbi_bonus',
] as const

export const MLB_PITCHING_STAT_KEYS = [
  'outs_recorded', 'innings_pitched', 'wins', 'losses', 'saves', 'holds',
  'save_opportunities', 'blown_saves', 'pitch_strikeouts', 'walks_allowed',
  'hits_allowed', 'earned_runs', 'runs_allowed', 'home_runs_allowed', 'hit_batters',
  'quality_starts', 'complete_games', 'complete_game_shutouts', 'no_hitters',
  'perfect_games', 'pickoffs', 'balks', 'wild_pitches',
] as const

export const MLB_STAT_KEYS = [...MLB_HITTING_STAT_KEYS, ...MLB_PITCHING_STAT_KEYS] as const
export type MlbStatKey = (typeof MLB_STAT_KEYS)[number]

export const MLB_STAT_LABELS: Record<string, string> = {
  // Hitting
  plate_appearances: 'Plate Appearances', at_bats: 'At Bats', runs: 'Runs', singles: 'Singles',
  doubles: 'Doubles', triples: 'Triples', home_runs: 'Home Runs', total_bases: 'Total Bases',
  rbis: 'RBIs', walks: 'Walks (BB)', intentional_walks: 'Intentional Walks', hit_by_pitch: 'Hit By Pitch',
  strikeouts: 'Strikeouts (K)', stolen_bases: 'Stolen Bases', caught_stealing: 'Caught Stealing',
  sacrifice_flies: 'Sacrifice Flies', sacrifice_bunts: 'Sacrifice Bunts',
  ground_into_double_play: 'Ground Into Double Play', cycle_bonus: 'Hit For Cycle Bonus',
  grand_slam_bonus: 'Grand Slam Bonus', game_winning_rbi_bonus: 'Game-Winning RBI Bonus',
  // Pitching
  outs_recorded: 'Outs Recorded', innings_pitched: 'Innings Pitched', wins: 'Wins', losses: 'Losses',
  saves: 'Saves', holds: 'Holds', save_opportunities: 'Save Opportunities', blown_saves: 'Blown Saves',
  pitch_strikeouts: 'Strikeouts (K)', walks_allowed: 'Walks Allowed', hits_allowed: 'Hits Allowed',
  earned_runs: 'Earned Runs', runs_allowed: 'Runs Allowed', home_runs_allowed: 'Home Runs Allowed',
  hit_batters: 'Hit Batters', quality_starts: 'Quality Starts', complete_games: 'Complete Games',
  complete_game_shutouts: 'Complete Game Shutouts', no_hitters: 'No-Hitters',
  perfect_games: 'Perfect Games', pickoffs: 'Pickoffs', balks: 'Balks', wild_pitches: 'Wild Pitches',
}

// ============================================================
// PRESETS
// ============================================================

const AF_DEFAULT: MlbScoringPreset = {
  key: 'af_default',
  label: 'AllFantasy Default',
  source: 'AF_DEFAULT',
  description: 'Balanced MLB scoring optimized for AllFantasy league types including specialty formats.',
  rules: {
    // Hitting
    runs: 1, singles: 1, doubles: 2, triples: 3, home_runs: 4, rbis: 1,
    walks: 1, hit_by_pitch: 1, stolen_bases: 2, caught_stealing: -1, strikeouts: -1,
    cycle_bonus: 5, grand_slam_bonus: 1,
    // Pitching
    innings_pitched: 3, pitch_strikeouts: 1, wins: 5, losses: -5, saves: 5, holds: 3,
    earned_runs: -2, hits_allowed: -1, walks_allowed: -1, hit_batters: -1,
    complete_games: 3, complete_game_shutouts: 5, no_hitters: 10, quality_starts: 3, blown_saves: -2,
  },
}

const SLEEPER_COMPATIBLE: MlbScoringPreset = {
  key: 'sleeper_compatible',
  label: 'Sleeper-Compatible',
  source: 'PLATFORM_PRESET',
  description: 'Sleeper-compatible MLB scoring. Note: Sleeper does not currently offer official fantasy baseball support. This is a compatibility baseline using AF stat structure.',
  warning: 'Sleeper does not currently support fantasy baseball leagues. This preset uses a Sleeper-friendly stat structure but is not an official Sleeper preset. Specialty leagues are optimized for AllFantasy scoring.',
  rules: { ...AF_DEFAULT.rules },
}

const ESPN_DEFAULT: MlbScoringPreset = {
  key: 'espn_default',
  label: 'ESPN Default',
  source: 'PLATFORM_PRESET',
  description: 'ESPN standard points-league scoring for MLB.',
  warning: 'This scoring preset is based on ESPN\'s default format. Specialty leagues are optimized for AllFantasy scoring and may not score exactly as intended under this preset.',
  rules: {
    // Hitting
    total_bases: 1, runs: 1, rbis: 1, walks: 1, stolen_bases: 1, strikeouts: -1,
    // Pitching
    innings_pitched: 3, wins: 5, losses: -5, saves: 5, pitch_strikeouts: 1,
    earned_runs: -2, hits_allowed: -1, walks_allowed: -1,
  },
}

const YAHOO_DEFAULT: MlbScoringPreset = {
  key: 'yahoo_default',
  label: 'Yahoo Default',
  source: 'PLATFORM_PRESET',
  description: 'Yahoo-compatible head-to-head points baseline for MLB.',
  warning: 'This scoring preset is based on Yahoo\'s default format. Specialty leagues are optimized for AllFantasy scoring and may not score exactly as intended under this preset.',
  rules: {
    // Hitting
    runs: 1, singles: 1, doubles: 2, triples: 3, home_runs: 4, rbis: 1,
    walks: 1, hit_by_pitch: 1, stolen_bases: 2, strikeouts: -0.5,
    // Pitching
    innings_pitched: 3, pitch_strikeouts: 1, wins: 5, saves: 5, holds: 2,
    earned_runs: -2, hits_allowed: -1, walks_allowed: -1, losses: -3, blown_saves: -1,
  },
}

const PRESET_REGISTRY: Record<MlbScoringPresetKey, MlbScoringPreset> = {
  af_default: AF_DEFAULT,
  sleeper_compatible: SLEEPER_COMPATIBLE,
  espn_default: ESPN_DEFAULT,
  yahoo_default: YAHOO_DEFAULT,
  custom: { key: 'custom', label: 'Custom', source: 'CUSTOM', description: 'Custom scoring values.', rules: { ...AF_DEFAULT.rules } },
}

export function getMlbScoringPresets(): MlbScoringPreset[] { return Object.values(PRESET_REGISTRY) }
export function getMlbScoringPreset(key: MlbScoringPresetKey): MlbScoringPreset { return PRESET_REGISTRY[key] ?? PRESET_REGISTRY.af_default }
export function getAfDefaultMlbScoring(): MlbScoringPreset { return PRESET_REGISTRY.af_default }

export function detectMlbPresetMatch(rules: Record<string, number>): MlbScoringPresetKey | null {
  for (const preset of [AF_DEFAULT, ESPN_DEFAULT, YAHOO_DEFAULT]) {
    const keys = Object.keys(preset.rules)
    const nonZero = Object.entries(rules).filter(([, v]) => v !== 0)
    if (nonZero.length !== keys.length) continue
    if (keys.every((k) => Math.abs((rules[k] ?? 0) - (preset.rules[k] ?? 0)) < 0.001)) return preset.key
  }
  return null
}

export function buildFullMlbScoringConfig(presetKey: MlbScoringPresetKey): Record<string, number> {
  const preset = getMlbScoringPreset(presetKey)
  const config: Record<string, number> = {}
  for (const key of MLB_STAT_KEYS) config[key] = preset.rules[key] ?? 0
  return config
}

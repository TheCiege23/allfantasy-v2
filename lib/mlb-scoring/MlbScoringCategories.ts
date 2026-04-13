/**
 * lib/mlb-scoring/MlbScoringCategories.ts
 * Complete MLB scoring category definitions for the commissioner panel.
 * Organised into 10 tabs matching the spec:
 *   HITTING:  Batting | Power | Discipline | Base Running
 *   PITCHING: Pitching | Results | Efficiency | Control
 *   GLOBAL:   Bonuses | Misc
 *   PREMIUM:  Advanced (sabermetrics — gated)
 */

export interface MlbScoringRow {
  key: string
  label: string
  helper?: string
  premium?: boolean
  defaultValue: number
}

export interface MlbScoringCategory {
  id: string
  label: string
  /** 'hitting' | 'pitching' | 'global' | 'premium' */
  group: string
  rows: MlbScoringRow[]
}

// ============================================================
// HITTING
// ============================================================

const BATTING: MlbScoringCategory = {
  id: 'batting',
  label: 'Batting',
  group: 'hitting',
  rows: [
    { key: 'plate_appearances', label: 'Plate Appearances', defaultValue: 0 },
    { key: 'at_bats',           label: 'At Bats',           defaultValue: 0 },
    { key: 'runs',              label: 'Runs',              defaultValue: 1 },
    { key: 'singles',           label: 'Singles',           defaultValue: 1 },
    { key: 'doubles',           label: 'Doubles',           defaultValue: 2 },
    { key: 'triples',           label: 'Triples',           defaultValue: 3 },
    { key: 'home_runs',         label: 'Home Runs',         defaultValue: 4 },
    { key: 'total_bases',       label: 'Total Bases',       helper: 'Total bases accumulated (1B=1, 2B=2, 3B=3, HR=4)', defaultValue: 0 },
    { key: 'rbis',              label: 'RBIs',              defaultValue: 1 },
    { key: 'sacrifice_flies',   label: 'Sacrifice Flies',   defaultValue: 0 },
    { key: 'sacrifice_bunts',   label: 'Sacrifice Bunts',   defaultValue: 0 },
  ],
}

const POWER: MlbScoringCategory = {
  id: 'power',
  label: 'Power',
  group: 'hitting',
  rows: [
    { key: 'grand_slam_bonus',      label: 'Grand Slam Bonus',        helper: 'Extra bonus per grand slam (on top of home_runs value)', defaultValue: 1 },
    { key: 'cycle_bonus',           label: 'Hit For Cycle Bonus',     defaultValue: 5 },
    { key: 'game_winning_rbi_bonus',label: 'Game-Winning RBI Bonus',  defaultValue: 0 },
    { key: 'two_hr_game_bonus',     label: '2 HR Game Bonus',         defaultValue: 0 },
    { key: 'three_hr_game_bonus',   label: '3 HR Game Bonus',         defaultValue: 0 },
    { key: 'five_rbi_game_bonus',   label: '5 RBI Game Bonus',        defaultValue: 0 },
    { key: 'ten_tb_game_bonus',     label: '10 Total Bases Game Bonus', defaultValue: 0 },
  ],
}

const DISCIPLINE: MlbScoringCategory = {
  id: 'discipline',
  label: 'Discipline',
  group: 'hitting',
  rows: [
    { key: 'walks',              label: 'Walk (BB)',           defaultValue: 1 },
    { key: 'intentional_walks', label: 'Intentional Walk',    defaultValue: 0 },
    { key: 'hit_by_pitch',      label: 'Hit By Pitch',        defaultValue: 1 },
    { key: 'strikeouts',        label: 'Strikeout (K)',       defaultValue: -1 },
  ],
}

const BASE_RUNNING: MlbScoringCategory = {
  id: 'base_running',
  label: 'Base Running',
  group: 'hitting',
  rows: [
    { key: 'stolen_bases',           label: 'Stolen Base',             defaultValue: 2 },
    { key: 'caught_stealing',        label: 'Caught Stealing',         defaultValue: -1 },
    { key: 'multi_steal_game_bonus', label: 'Multi-Steal Game Bonus',  defaultValue: 0 },
    { key: 'ground_into_double_play',label: 'Ground Into Double Play', defaultValue: 0 },
  ],
}

// ============================================================
// PITCHING
// ============================================================

const PITCHING: MlbScoringCategory = {
  id: 'pitching',
  label: 'Pitching',
  group: 'pitching',
  rows: [
    { key: 'outs_recorded',   label: 'Outs Recorded',   helper: 'Points per out recorded', defaultValue: 0 },
    { key: 'innings_pitched', label: 'Innings Pitched',  helper: 'Points per inning pitched', defaultValue: 3 },
    { key: 'hits_allowed',    label: 'Hits Allowed',     defaultValue: -1 },
    { key: 'earned_runs',     label: 'Earned Runs',      defaultValue: -2 },
    { key: 'runs_allowed',    label: 'Runs Allowed',     defaultValue: 0 },
    { key: 'walks_allowed',   label: 'Walks Allowed',    defaultValue: -1 },
    { key: 'hit_batters',     label: 'Hit Batters',      defaultValue: -1 },
    { key: 'home_runs_allowed',label: 'Home Runs Allowed', defaultValue: 0 },
    { key: 'wild_pitches',    label: 'Wild Pitches',     defaultValue: 0 },
    { key: 'balks',           label: 'Balks',            defaultValue: 0 },
    { key: 'pickoffs',        label: 'Pickoffs',         defaultValue: 0 },
  ],
}

const RESULTS: MlbScoringCategory = {
  id: 'results',
  label: 'Results',
  group: 'pitching',
  rows: [
    { key: 'wins',                  label: 'Win',              defaultValue: 5 },
    { key: 'losses',                label: 'Loss',             defaultValue: -5 },
    { key: 'saves',                 label: 'Save',             defaultValue: 5 },
    { key: 'holds',                 label: 'Hold',             defaultValue: 3 },
    { key: 'save_opportunities',    label: 'Save Opportunity', defaultValue: 0 },
    { key: 'blown_saves',           label: 'Blown Save',       defaultValue: -2 },
    { key: 'complete_games',        label: 'Complete Game',    defaultValue: 3 },
    { key: 'complete_game_shutouts',label: 'Shutout',          defaultValue: 5 },
    { key: 'no_hitters',            label: 'No-Hitter',        defaultValue: 10 },
    { key: 'perfect_games',         label: 'Perfect Game',     defaultValue: 0 },
  ],
}

const EFFICIENCY: MlbScoringCategory = {
  id: 'efficiency',
  label: 'Efficiency',
  group: 'pitching',
  rows: [
    { key: 'quality_starts',         label: 'Quality Start',            defaultValue: 3 },
    { key: 'pitcher_ten_k_game',     label: '10+ Strikeout Game Bonus', defaultValue: 0 },
    { key: 'pitcher_fifteen_k_game', label: '15+ Strikeout Game Bonus', defaultValue: 0 },
    { key: 'cg_shutout_bonus',       label: 'CG Shutout Bonus',         defaultValue: 0 },
    { key: 'perfect_game_bonus',     label: 'Perfect Game Bonus',       defaultValue: 0 },
  ],
}

const CONTROL: MlbScoringCategory = {
  id: 'control',
  label: 'Control',
  group: 'pitching',
  rows: [
    { key: 'pitch_strikeouts', label: 'Strikeouts (Pitcher)', defaultValue: 1 },
    { key: 'walk_penalty',     label: 'Walk Penalty',         helper: 'Additional per-walk penalty on top of walks_allowed', defaultValue: 0 },
    { key: 'k_bonus',          label: 'Strikeout Bonus',      helper: '"K-boom" extra per strikeout after 8', defaultValue: 0 },
  ],
}

// ============================================================
// GLOBAL
// ============================================================

const BONUSES: MlbScoringCategory = {
  id: 'bonuses',
  label: 'Bonuses',
  group: 'global',
  rows: [
    { key: 'two_hr_game_bonus',      label: '2 HR Game',           defaultValue: 0 },
    { key: 'three_hr_game_bonus',    label: '3 HR Game',           defaultValue: 0 },
    { key: 'five_rbi_game_bonus',    label: '5 RBI Game',          defaultValue: 0 },
    { key: 'ten_tb_game_bonus',      label: '10 Total Bases Game', defaultValue: 0 },
    { key: 'multi_steal_game_bonus', label: 'Multi-Steal Game',    defaultValue: 0 },
    { key: 'pitcher_ten_k_game',     label: '10+ Strikeout Game',  defaultValue: 0 },
    { key: 'pitcher_fifteen_k_game', label: '15+ Strikeout Game',  defaultValue: 0 },
    { key: 'cg_shutout_bonus',       label: 'CG Shutout Bonus',    defaultValue: 0 },
    { key: 'perfect_game_bonus',     label: 'Perfect Game Bonus',  defaultValue: 0 },
    { key: 'cycle_bonus',            label: 'Hit For Cycle',       defaultValue: 5 },
  ],
}

const MISC: MlbScoringCategory = {
  id: 'misc',
  label: 'Misc',
  group: 'global',
  rows: [
    { key: 'fielding_error',          label: 'Error',                  defaultValue: 0 },
    { key: 'ground_into_double_play', label: 'Ground Into Double Play',defaultValue: 0 },
    { key: 'pickoffs',                label: 'Pickoff',                defaultValue: 0 },
    { key: 'balks',                   label: 'Balk',                   defaultValue: 0 },
    { key: 'wild_pitches',            label: 'Wild Pitch',             defaultValue: 0 },
  ],
}

// ============================================================
// PREMIUM (Advanced Sabermetrics — gated)
// ============================================================

export const MLB_PREMIUM_SCORING: MlbScoringCategory = {
  id: 'advanced',
  label: 'Advanced',
  group: 'premium',
  rows: [
    { key: 'ops_bonus',             label: 'OPS Bonus',              premium: true, helper: 'Bonus points per 0.100 OPS above .700', defaultValue: 0 },
    { key: 'woba_bonus',            label: 'wOBA Bonus',             premium: true, helper: 'Weighted On-Base Average bonus points', defaultValue: 0 },
    { key: 'wrc_plus_bonus',        label: 'wRC+ Bonus',             premium: true, helper: 'Weighted Runs Created+ bonus (100 = league avg)', defaultValue: 0 },
    { key: 'fip_bonus',             label: 'FIP Bonus',              premium: true, helper: 'Fielding Independent Pitching efficiency bonus', defaultValue: 0 },
    { key: 'xera_bonus',            label: 'xERA Bonus',             premium: true, helper: 'Expected ERA efficiency bonus', defaultValue: 0 },
    { key: 'babip_bonus',           label: 'BABIP Bonus',            premium: true, helper: 'Batting Average on Balls In Play bonus', defaultValue: 0 },
    { key: 'barrel_rate_bonus',     label: 'Barrel Rate Bonus',      premium: true, helper: 'Bonus per barrel (statcast exit velocity + angle)', defaultValue: 0 },
    { key: 'exit_velocity_bonus',   label: 'Exit Velocity Bonus',    premium: true, helper: 'Bonus per 1 mph above 95 mph exit velocity', defaultValue: 0 },
    { key: 'launch_angle_bonus',    label: 'Launch Angle Bonus',     premium: true, helper: 'Bonus for optimal launch angle (8–32°)', defaultValue: 0 },
  ],
}

// ============================================================
// EXPORTED COLLECTION
// ============================================================

export const MLB_SCORING_CATEGORIES: MlbScoringCategory[] = [
  // Hitting
  BATTING,
  POWER,
  DISCIPLINE,
  BASE_RUNNING,
  // Pitching
  PITCHING,
  RESULTS,
  EFFICIENCY,
  CONTROL,
  // Global
  BONUSES,
  MISC,
]

/** All categories including premium */
export const MLB_ALL_SCORING_CATEGORIES: MlbScoringCategory[] = [
  ...MLB_SCORING_CATEGORIES,
  MLB_PREMIUM_SCORING,
]

/** Build a flat defaults map for every MLB stat key */
export function buildMlbScoringDefaults(): Record<string, number> {
  const defaults: Record<string, number> = {}
  for (const cat of MLB_ALL_SCORING_CATEGORIES) {
    for (const row of cat.rows) {
      if (!(row.key in defaults)) defaults[row.key] = row.defaultValue
    }
  }
  return defaults
}

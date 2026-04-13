/**
 * lib/nba-scoring/NbaScoringCategories.ts
 * Complete NBA scoring category definitions for the commissioner popup.
 * Organized into 10 tabs matching the NBA scoring UI design.
 *
 * Tabs: General, Shooting, Free Throws, Three-Point, Rebounds,
 *       Playmaking, Defense, Discipline, Bonuses, Advanced
 */

export interface NbaScoringRow {
  key: string
  label: string
  helper?: string
  premium?: boolean
  defaultValue: number
}

export interface NbaScoringCategory {
  id: string
  label: string
  rows: NbaScoringRow[]
}

export const NBA_SCORING_CATEGORIES: NbaScoringCategory[] = [
  {
    id: 'general',
    label: 'General',
    rows: [
      { key: 'points_scored', label: 'Points Scored', helper: '0.5 pts per point scored (AF default)', defaultValue: 0.5 },
      { key: 'seconds_played', label: 'Seconds Played', defaultValue: 0 },
      { key: 'minutes_played', label: 'Minutes Played', defaultValue: 0 },
      { key: 'plus_minus', label: 'Plus/Minus', defaultValue: 0 },
    ],
  },
  {
    id: 'shooting',
    label: 'Shooting',
    rows: [
      { key: 'field_goals_made', label: 'Field Goals Made', defaultValue: 0 },
      { key: 'field_goals_attempted', label: 'Field Goals Attempted', defaultValue: 0 },
      { key: 'field_goals_missed', label: 'Field Goals Missed', defaultValue: 0 },
      { key: 'two_point_made', label: '2-Point Field Goals Made', defaultValue: 0 },
      { key: 'two_point_attempted', label: '2-Point Field Goals Attempted', defaultValue: 0 },
      { key: 'two_point_missed', label: '2-Point Field Goals Missed', defaultValue: 0 },
    ],
  },
  {
    id: 'free_throws',
    label: 'Free Throws',
    rows: [
      { key: 'free_throws_made', label: 'Free Throws Made', defaultValue: 0 },
      { key: 'free_throws_attempted', label: 'Free Throws Attempted', defaultValue: 0 },
      { key: 'free_throws_missed', label: 'Free Throws Missed', defaultValue: 0 },
    ],
  },
  {
    id: 'three_point',
    label: 'Three-Point',
    rows: [
      { key: 'three_point_made', label: '3-Point Shots Made', helper: '0.5 bonus per made 3 (AF default)', defaultValue: 0.5 },
      { key: 'three_point_attempted', label: '3-Point Shots Attempted', defaultValue: 0 },
      { key: 'three_point_missed', label: '3-Point Shots Missed', defaultValue: 0 },
    ],
  },
  {
    id: 'rebounds',
    label: 'Rebounds',
    rows: [
      { key: 'rebound', label: 'Rebound', helper: '1 pt per total rebound (AF default)', defaultValue: 1 },
      { key: 'offensive_rebound', label: 'Offensive Rebound', defaultValue: 0 },
      { key: 'defensive_rebound', label: 'Defensive Rebound', defaultValue: 0 },
    ],
  },
  {
    id: 'playmaking',
    label: 'Playmaking',
    rows: [
      { key: 'assist', label: 'Assist', helper: '1 pt per assist (AF default)', defaultValue: 1 },
      { key: 'turnover', label: 'Turnover', defaultValue: -1 },
    ],
  },
  {
    id: 'defense',
    label: 'Defense',
    rows: [
      { key: 'steal', label: 'Steal', helper: '2 pts per steal (AF default)', defaultValue: 2 },
      { key: 'block', label: 'Block', helper: '2 pts per block (AF default)', defaultValue: 2 },
    ],
  },
  {
    id: 'discipline',
    label: 'Discipline',
    rows: [
      { key: 'personal_foul', label: 'Personal Foul', defaultValue: 0 },
      { key: 'technical_foul', label: 'Technical Foul', defaultValue: -2 },
      { key: 'flagrant_foul', label: 'Flagrant Foul', defaultValue: -2 },
    ],
  },
  {
    id: 'bonuses',
    label: 'Bonuses',
    rows: [
      { key: 'double_double', label: 'Double-Double', defaultValue: 1 },
      { key: 'triple_double', label: 'Triple-Double', defaultValue: 2 },
      { key: 'forty_plus_points_bonus', label: '40+ Points Bonus', defaultValue: 2 },
      { key: 'fifty_plus_points_bonus', label: '50+ Points Bonus', defaultValue: 2 },
      { key: 'fifteen_plus_assists_bonus', label: '15+ Assists Bonus', defaultValue: 0 },
      { key: 'twenty_plus_rebounds_bonus', label: '20+ Rebounds Bonus', defaultValue: 0 },
      { key: 'ten_plus_fg_bonus', label: '10+ Made Field Goals Bonus', defaultValue: 0 },
      { key: 'five_plus_threes_bonus', label: '5+ Made 3PT Bonus', defaultValue: 0 },
    ],
  },
]

/** Premium-only advanced scoring rows. */
export const NBA_PREMIUM_SCORING: NbaScoringCategory = {
  id: 'advanced',
  label: 'Advanced',
  rows: [
    { key: 'usage_rate_bonus', label: 'Usage Rate Bonus', premium: true, helper: 'Bonus based on usage rate thresholds', defaultValue: 0 },
    { key: 'efficiency_bonus', label: 'Efficiency Bonus', premium: true, helper: 'Bonus based on game efficiency rating', defaultValue: 0 },
    { key: 'true_shooting_bonus', label: 'True Shooting Bonus', premium: true, helper: 'Bonus for high true shooting percentage games', defaultValue: 0 },
    { key: 'assist_turnover_bonus', label: 'Assist-to-Turnover Bonus', premium: true, helper: 'Bonus for high assist-to-turnover ratio games', defaultValue: 0 },
  ],
}

/** Build a full default scoring config from all categories. */
export function buildFullNbaDefaultConfig(): Record<string, number> {
  const config: Record<string, number> = {}
  for (const cat of NBA_SCORING_CATEGORIES) {
    for (const row of cat.rows) {
      config[row.key] = row.defaultValue
    }
  }
  for (const row of NBA_PREMIUM_SCORING.rows) {
    config[row.key] = row.defaultValue
  }
  return config
}

/** Get all scoring stat keys across all categories. */
export function getAllNbaScoringKeys(): string[] {
  const keys: string[] = []
  for (const cat of NBA_SCORING_CATEGORIES) {
    for (const row of cat.rows) keys.push(row.key)
  }
  for (const row of NBA_PREMIUM_SCORING.rows) keys.push(row.key)
  return keys
}

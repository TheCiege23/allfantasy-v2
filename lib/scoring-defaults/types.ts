/**
 * Default scoring settings by sport — types for rules, templates, and point calculation.
 */

export type SportType =
  | 'NFL'
  | 'NBA'
  | 'MLB'
  | 'NHL'
  | 'NCAAF'
  | 'NCAAB'
  | 'SOCCER'

/** Single scoring rule: stat key, point value, optional multiplier, enabled flag. */
export interface ScoringRuleDefinition {
  statKey: string
  pointsValue: number
  multiplier: number
  enabled: boolean
}

/** Full default scoring template for a sport/format (in-memory, no DB). */
export interface ScoringTemplateDefinition {
  templateId: string
  sportType: SportType
  name: string
  formatType: string
  rules: ScoringRuleDefinition[]
}

/** Raw stats keyed by stat key (e.g. from box score or projection). */
export interface PlayerStatsRecord {
  [statKey: string]: number
}

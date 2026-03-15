/**
 * AI Simulation Integration — types for simulation/warehouse context passed to AI.
 */

export const AI_SPORTS = [
  'NFL',
  'NHL',
  'NBA',
  'MLB',
  'NCAAB',
  'NCAAF',
  'SOCCER',
] as const

export type AISport = (typeof AI_SPORTS)[number]

export interface SimulationWarehouseContext {
  leagueId: string
  leagueName?: string
  sport: string
  /** Matchup win probabilities / expected scores for current week (if available) */
  matchupSummary?: string
  /** Playoff odds / season simulation summary (if available) */
  playoffOddsSummary?: string
  /** Dynasty projection summary (3yr/5yr strength, rebuild prob) if available */
  dynastySummary?: string
  /** Warehouse league history summary (matchups, standings, transactions counts) */
  warehouseSummary?: string
}

export type InsightType = 'matchup' | 'playoff' | 'dynasty' | 'trade' | 'waiver' | 'draft'

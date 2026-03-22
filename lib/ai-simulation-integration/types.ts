/**
 * AI Simulation Integration — shared types.
 */

import type { SupportedSport } from '@/lib/sport-scope'

export type AISport = SupportedSport

export type InsightType =
  | 'matchup'
  | 'playoff'
  | 'dynasty'
  | 'trade'
  | 'waiver'
  | 'draft'

export const AI_MODEL_RESPONSIBILITIES = {
  deepseek: 'statistical modeling, simulation outputs, and structured quantitative reasoning',
  grok: 'trend interpretation, meta context framing, and momentum narratives',
  openai: 'user-facing explanations, strategy recommendations, and actionable next steps',
} as const

export interface SimulationWarehouseContext {
  leagueId: string
  leagueName?: string
  sport: AISport
  /** Matchup win probabilities / expected scores for current week (if available). */
  matchupSummary?: string
  /** Playoff odds / season simulation summary (if available). */
  playoffOddsSummary?: string
  /** Dynasty projection summary (3yr/5yr strength, rebuild prob) if available. */
  dynastySummary?: string
  /** Warehouse league history summary (matchups, standings, transactions counts). */
  warehouseSummary?: string
  /** League intelligence graph context (rivalry/trade/power-shift). */
  leagueGraphSummary?: string
  /** Global meta context summary for this sport. */
  globalMetaSummary?: string
  /** League scoring/format context summary for AI. */
  leagueSettingsSummary?: string
}

export interface AIInsightBundle {
  sport: AISport
  insightType: InsightType
  contextText: string
  sources: string[]
  modelResponsibilities: typeof AI_MODEL_RESPONSIBILITIES
}

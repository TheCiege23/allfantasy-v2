/**
 * Player Trend Detection Engine – types and constants.
 * Supports NFL, NBA, MLB, NHL, NCAAF, NCAAB.
 */

export const TREND_SIGNAL_TYPES = [
  'waiver_add',
  'waiver_drop',
  'trade_request',
  'draft_pick',
  'lineup_start',
  'ai_recommendation',
  'injury',
] as const

export type TrendSignalType = (typeof TREND_SIGNAL_TYPES)[number]

export const TREND_DIRECTIONS = ['Rising', 'Hot', 'Stable', 'Falling', 'Cold'] as const

export type TrendDirection = (typeof TREND_DIRECTIONS)[number]

export interface TrendSignals {
  addRate: number
  dropRate: number
  tradeInterest: number
  draftFrequency: number
  lineupStartRate: number
  injuryImpact: number
}

export const DEFAULT_TREND_WEIGHTS: Record<keyof TrendSignals, number> = {
  addRate: 0.25,
  dropRate: -0.2,
  tradeInterest: 0.2,
  draftFrequency: 0.2,
  lineupStartRate: 0.15,
  injuryImpact: -0.15,
}

/** Window (ms) for aggregating signals; older events count less or are ignored */
export const TREND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/** Minimum events before we classify direction (vs Stable) */
export const MIN_EVENTS_FOR_DIRECTION = 3

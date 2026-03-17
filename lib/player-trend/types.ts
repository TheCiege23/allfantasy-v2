/**
 * Player Trend Detection Engine – types and constants.
 * Supports NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER.
 */

export const TREND_SIGNAL_TYPES = [
  'waiver_add',
  'waiver_drop',
  'trade_request',
  'draft_pick',
  'lineup_start',
  'ai_recommendation',
  'injury',
  'injury_event',
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

/** PROMPT 135: trend feed categories for detection engine */
export const TREND_FEED_TYPES = [
  'hot_streak',
  'cold_streak',
  'breakout_candidate',
  'sell_high_candidate',
] as const

export type TrendFeedType = (typeof TREND_FEED_TYPES)[number]

/** Deterministic signals exposed to UI and AI */
export interface TrendDeterministicSignals {
  /** Current trendScore minus previousTrendScore (performance delta) */
  performanceDelta: number | null
  /** addRate - dropRate (usage change) */
  usageChange: number
  /** lineupStartRate as proxy for minutes/snap share */
  minutesOrSnapShare: number
  /** Composite efficiency (trendScore; can be broken out per sport later) */
  efficiencyScore: number
}

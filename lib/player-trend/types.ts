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
  /** Recent usage/opportunity window delta, with add/drop fallback */
  usageChange: number
  /** Most recent minutes/snap/participation share, normalized to 0-1 when possible */
  minutesOrSnapShare: number
  /** Composite efficiency score derived from fantasy points per opportunity/share */
  efficiencyScore: number
  /** Opportunity volume delta between recent and prior windows */
  volumeChange: number | null
  /** Efficiency delta between recent and prior windows */
  efficiencyDelta: number | null
  /** Confidence in the deterministic read, 0-1 */
  confidence: number
  /** Aggregate signal strength used to sort the feed, 0-100 */
  signalStrength: number
}

export interface TrendSignalSnapshot {
  dataSource: 'game_stats' | 'analytics_snapshot' | 'trend_baseline'
  recentGamesSample: number
  priorGamesSample: number
  recentFantasyPointsAvg: number | null
  priorFantasyPointsAvg: number | null
  recentUsageValue: number | null
  priorUsageValue: number | null
  recentMinutesOrShare: number | null
  priorMinutesOrShare: number | null
  recentEfficiency: number | null
  priorEfficiency: number | null
  expectedFantasyPointsPerGame: number | null
  seasonFantasyPointsPerGame: number | null
  expectedGap: number | null
  weeklyVolatility: number | null
  breakoutRating: number | null
  currentAdpTrend: number | null
}

export interface TrendSummary {
  headline: string
  rationale: string
  recommendation: string
}

export interface TrendFeedItem {
  trendType: TrendFeedType
  playerId: string
  sport: string
  displayName: string | null
  position: string | null
  team: string | null
  signals: TrendDeterministicSignals
  snapshot: TrendSignalSnapshot
  summary: TrendSummary
  trendScore: number
  /** Underlying direction (Hot, Rising, Falling, Cold) */
  direction: string
  updatedAt: string
}

export interface TrendAIInsight {
  /** DeepSeek: whether trend math is consistent and thresholds reasonable */
  mathValidation: string | null
  /** Grok: hype vs numbers (e.g. narrative_driven, numbers_backed) */
  hypeDetection: string | null
  /** OpenAI: one-sentence actionable recommendation */
  actionableExplanation: string | null
}

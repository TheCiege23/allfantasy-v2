/**
 * Strategy Meta Engine (PROMPT 136) - types for meta analysis output.
 * Data sources: league warehouse, draft logs, trade history.
 */

export type MetaTrendDirection = 'Rising' | 'Stable' | 'Falling'
export type MetaInsightCategory = 'draft' | 'position' | 'waiver'
export type MetaAnalysisMode = 'time_window' | 'season_compare' | 'mixed'

export interface MetaOverviewCard {
  id: string
  label: string
  value: string
  detail: string
  tone: 'positive' | 'neutral' | 'negative'
}

export interface MetaInsightHeadline {
  id: string
  category: MetaInsightCategory
  title: string
  summary: string
  confidence: number
}

export interface MetaSourceCoverage {
  analysisMode: MetaAnalysisMode
  windowDays: number
  leaguesAnalyzed: number
  seasonsAnalyzed: number[]
  strategyReportCount: number
  draftFactCount: number
  rosterSnapshotCount: number
  standingFactCount: number
  tradeCount: number
  tradeInsightCount: number
  waiverTransactionCount: number
  waiverClaimCount: number
  transactionFactCount: number
}

/** Single draft strategy with usage/success and trend (shift signal). */
export interface DraftStrategyShift {
  strategyType: string
  strategyLabel?: string
  sport: string
  leagueFormat: string
  usageRate: number
  successRate: number
  trendingDirection: MetaTrendDirection
  sampleSize: number
  /** Human-readable shift description */
  shiftLabel: string
  recentUsageRate: number
  baselineUsageRate: number
  usageDelta: number
  recentSuccessRate: number
  baselineSuccessRate: number | null
  successDelta: number | null
  earlyRoundFocus: string[]
  supportingSignals: string[]
  signalStrength: number
  confidence: number
  summary: string
}

/** Position-level value from trade history / learning insights. */
export interface PositionValueChange {
  position: string
  sport: string
  /** Average value given in trades (when this position is involved). */
  avgValueGiven: number | null
  /** Average value received. */
  avgValueReceived: number | null
  sampleSize: number
  marketTrend: string | null
  /** e.g. "Rising" | "Stable" | "Falling" */
  direction: string | null
  draftShare: number
  priorDraftShare: number | null
  draftShareDelta: number | null
  rosterPressure: number
  tradeDemandScore: number
  valueScore: number
  confidence: number
  summary: string
}

/** Waiver activity aggregated by sport over a time window. */
export interface WaiverStrategyTrend {
  sport: string
  /** Count of waiver_add events in window */
  addCount: number
  /** Count of waiver_drop events in window */
  dropCount: number
  /** Window days (e.g. 7, 30) */
  windowDays: number
  /** addCount - dropCount (net adds) */
  netAdds: number
  /** addCount / windowDays */
  addRatePerDay: number
  /** dropCount / windowDays */
  dropRatePerDay: number
  primaryPosition: string | null
  topAddPositions: string[]
  faabAggression: number | null
  churnRate: number
  streamingScore: number
  trendDirection: MetaTrendDirection
  confidence: number
  summary: string
}

/** Full meta analysis bundle for dashboard. */
export interface MetaAnalysisResult {
  draftStrategyShifts: DraftStrategyShift[]
  positionValueChanges: PositionValueChange[]
  waiverStrategyTrends: WaiverStrategyTrend[]
  overviewCards: MetaOverviewCard[]
  headlines: MetaInsightHeadline[]
  sourceCoverage: MetaSourceCoverage
  /** Sport filter applied (if any). */
  sport: string | null
  /** Analysis timestamp. */
  generatedAt: string
}

export interface MetaAnalysisOptions {
  sport?: string
  leagueFormat?: string
  /** Days for waiver/trade windows (default 30). */
  windowDays?: number
}

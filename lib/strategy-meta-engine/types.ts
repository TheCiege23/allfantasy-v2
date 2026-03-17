/**
 * Strategy Meta Engine (PROMPT 136) – types for meta analysis output.
 * Data sources: league warehouse, draft logs, trade history.
 */

/** Single draft strategy with usage/success and trend (shift signal). */
export interface DraftStrategyShift {
  strategyType: string
  sport: string
  leagueFormat: string
  usageRate: number
  successRate: number
  trendingDirection: 'Rising' | 'Stable' | 'Falling'
  sampleSize: number
  /** Human-readable shift description */
  shiftLabel: string
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
}

/** Full meta analysis bundle for dashboard. */
export interface MetaAnalysisResult {
  draftStrategyShifts: DraftStrategyShift[]
  positionValueChanges: PositionValueChange[]
  waiverStrategyTrends: WaiverStrategyTrend[]
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

/**
 * T4 Commissioner Trade Review — shared types (deterministic, rule-based). No AI, no auto-veto, no
 * value changes. Every field is a pure function of existing T2/T3 data.
 */

export const RISK_FLAGS = [
  'VALUE_DELTA_HIGH',
  'LOW_CONFIDENCE_VALUES',
  'ONE_SIDE_EMPTY',
  'FAAB_IMBALANCE',
  'DRAFT_PICK_INCLUDED',
  'DEADLINE_NEAR',
  'TRADE_ALREADY_ACCEPTED',
  'TRADE_ALREADY_VETOED',
  'VALUE_SNAPSHOT_MISSING',
  'MARKET_EVENT_HISTORY_MISSING',
] as const
export type RiskFlag = (typeof RISK_FLAGS)[number]

export const CONTEXT_FLAGS = [
  'CONTENDER_BUYING_POINTS',
  'REBUILDER_ACQUIRING_FUTURE_VALUE',
  'POSITION_NEED_FILLED',
  'DEPTH_LOSS_WARNING',
  'BYE_WEEK_COVERAGE',
  'NCAAF_LIMITED_DATA',
] as const
export type ContextFlag = (typeof CONTEXT_FLAGS)[number]

export interface ReviewSummary {
  reviewScore: number
  fairnessScore: number
  confidenceScore: number
  valueDelta: number
  grade: string | null
  status: string
  reviewRecommended: boolean
  lopsided: boolean
  deadlineFlag: boolean
  expired: boolean
  vetoMode: string
  reviewHours: number | null
}

export interface MarketContext {
  sampleSize: number
  averageFairness?: number
  medianFairness?: number
  acceptedCount?: number
  vetoedCount?: number
  recentCount?: number
  message?: string
}

export interface CommissionerReview {
  summary: ReviewSummary
  riskFlags: RiskFlag[]
  contextFlags: ContextFlag[]
  /** Deterministic, non-accusatory note lines (templated — never AI-generated). */
  notes: string[]
  marketContext: MarketContext
}

/**
 * T2 Trade Value Snapshot + Grader — shared types (deterministic foundation).
 *
 * No AI, no learning, no adaptation. Every value is a pure function of inputs captured at proposal
 * time. The snapshot is immutable once written.
 */

export const TRADE_VALUE_SNAPSHOT_VERSION = '1.0' as const

export type TradeAssetKind = 'player' | 'draft_pick' | 'faab' | 'future_consideration'

/** Raw value sources captured for a single asset. `null` = source not available at capture time. */
export interface AssetValueSources {
  projectionValue: number | null
  rankingValue: number | null
  adpValue: number | null
  fantasyCalcValue: number | null
}

/** Immutable per-asset snapshot row. */
export interface AssetValueSnapshot {
  kind: TradeAssetKind
  fromRosterId: string
  toRosterId: string
  // player
  playerId?: string | null
  playerName?: string | null
  position?: string | null
  team?: string | null
  // pick
  pickSeason?: number | null
  pickRound?: number | null
  pickLabel?: string | null
  // faab
  faabAmount?: number | null
  sources: AssetValueSources
  /** Deterministic normalized 0–10000 trade value for this asset. */
  internalValue: number
}

export interface TradeValueContext {
  sport: string
  leagueType: string
  scoring: string
  rosterFormat: string
  capturedAt: string
}

export interface SideTotals {
  rosterId: string
  total: number
  assets: AssetValueSnapshot[]
}

export interface TradeGrade {
  /** A+ … F */
  grade: string
  /** sideA.total − sideB.total (positive = sideA receives more) */
  valueDifference: number
  /** 0–100, 100 = perfectly even */
  fairnessScore: number
  /** 0–100, data completeness of the inputs */
  confidenceScore: number
  /** Deterministic, templated explanation lines (never AI-generated). */
  bullets: string[]
}

export interface CommissionerReview {
  fairnessScore: number
  lopsided: boolean
  reviewRecommended: boolean
  similarValueRange: { low: number; high: number }
}

export interface TradeValueSnapshot {
  version: typeof TRADE_VALUE_SNAPSHOT_VERSION
  context: TradeValueContext
  /** Exactly two sides for a two-party trade: [proposer, receiver]. */
  sides: SideTotals[]
  grade: TradeGrade
  commissionerReview: CommissionerReview
}

export type TeamStance = 'contender' | 'rebuilder' | 'middle'

export interface TeamProfile {
  rosterId: string
  stance: TeamStance
  winPct: number
  pointsFor: number
  weakPositions: string[]
  strongPositions: string[]
  depthIssues: boolean
}

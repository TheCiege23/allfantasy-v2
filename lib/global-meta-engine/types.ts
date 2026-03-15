/**
 * Global Meta Engine – types and meta type enum.
 * Tracks platform-wide trends across DraftMeta, WaiverMeta, TradeMeta, RosterMeta, StrategyMeta.
 */

export const META_TYPES = [
  'DraftMeta',
  'WaiverMeta',
  'TradeMeta',
  'RosterMeta',
  'StrategyMeta',
] as const

export type MetaType = (typeof META_TYPES)[number]

export const GLOBAL_META_SPORTS = [
  'NFL',
  'NHL',
  'NBA',
  'MLB',
  'NCAAF',
  'NCAAB',
  'SOCCER',
] as const

export type GlobalMetaSport = (typeof GLOBAL_META_SPORTS)[number]

export interface GlobalMetaSnapshotPayload {
  sport: string
  season: string
  weekOrPeriod: number
  metaType: MetaType
  data: Record<string, unknown>
}

export interface PlayerMetaTrendRow {
  playerId: string
  sport: string
  trendScore: number
  addRate: number
  dropRate: number
  tradeRate: number
  draftRate: number
  trendingDirection: string
  updatedAt: Date
}

export interface PositionMetaTrendRow {
  position: string
  sport: string
  usageRate: number
  draftRate: number
  rosterRate: number
  trendingDirection: string
}

export interface StrategyMetaSnapshotRow {
  strategyType: string
  sport: string
  usageRate: number
  successRate: number
  trendingDirection: string
  createdAt?: Date
}

export interface WeeklyMetaReport {
  sport: string
  season: string
  weekOrPeriod: number
  generatedAt: string
  playerTrending: Array<{ playerId: string; trendScore: number; direction: string }>
  positionTrends: PositionMetaTrendRow[]
  strategySummary: StrategyMetaSnapshotRow[]
  metaTypeSummaries: Record<MetaType, Record<string, unknown>>
}

export interface AIMetaSummaryInput {
  sport?: string
  metaType?: MetaType
  timeframe?: '24h' | '7d' | '30d'
}

export interface AIMetaSummary {
  summary: string
  topTrends: string[]
  sportContext: string
}

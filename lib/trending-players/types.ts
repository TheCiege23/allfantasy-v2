import type { SupportedSport } from '@/lib/sport-scope'

export type TrendSportFilter = 'ALL' | SupportedSport

export type TrendTypeId =
  | 'all'
  | 'add'
  | 'drop'
  | 'start'
  | 'sit'
  | 'trade'
  | 'search'
  | 'performance'
  | 'usage'
  | 'injury_replacement'
  | 'rookie'

export type TimeWindowId =
  | 'today'
  | '24h'
  | '3d'
  | '7d'
  | '14d'
  | '30d'
  | 'season'
  | 'dynasty_long'

export type ContextModeId =
  | 'general'
  | 'my_leagues'
  | 'my_team'
  | 'league_wide'
  | 'opponent_watch'
  | 'waiver_watch'
  | 'trade_market'
  | 'start_sit_market'

export type TrendingDashboardInput = {
  sportFilter: TrendSportFilter
  leagueId: string | null
  userId: string | null
  trendType: TrendTypeId
  position: string
  rookiesOnly: boolean
  timeWindow: TimeWindowId
  contextMode: ContextModeId
  limitPerSide: number
  skipAi?: boolean
}

export type TrendReasonChip =
  | 'Injury Opportunity'
  | 'Role Growth'
  | 'Breakout'
  | 'Trade Buzz'
  | 'Waiver Surge'
  | 'Start Surge'
  | 'Prospect Rise'
  | 'Lineup Promotion'
  | 'Minutes Jump'
  | 'Target Spike'
  | 'Matchup Risk'
  | 'Role Loss'
  | 'Injury Concern'
  | 'Demotion'
  | 'Volatile'
  | 'Performance Swing'
  | 'Usage Shift'

export type TrendPlayerCard = {
  rank: number
  playerId: string
  sport: SupportedSport | string
  name: string
  position: string
  team: string
  headshotUrl: string | null
  logoUrl: string | null
  trendScore: number
  trendDelta: number
  confidence: number
  rosteredPct: number | null
  snippet: string
  chips: TrendReasonChip[]
  sources: string[]
  injuryStatus: string | null
  isRookie: boolean | null
  dataFreshness: string
}

export type TrendingDashboardResult = {
  ok: true
  analysisScope: 'general' | 'league'
  sportLabel: string
  leagueName: string | null
  summary: {
    riserCount: number
    fallerCount: number
    biggestGainer: TrendPlayerCard | null
    biggestFaller: TrendPlayerCard | null
  }
  risers: TrendPlayerCard[]
  fallers: TrendPlayerCard[]
  aiNarrative: string | null
  chimmyPayload: Record<string, unknown>
  dataGaps: string[]
  degraded: boolean
  fetchedAt: string
}

export type TrendingDashboardError = {
  ok: false
  error: string
  code?: 'FORBIDDEN' | 'VALIDATION'
}

export type TrendingDashboardOutput = TrendingDashboardResult | TrendingDashboardError

/**
 * Global Fantasy Intelligence Engine (PROMPT 139) - types.
 * Inputs: trend detection, meta engine, dynasty projections, simulation results.
 * Output: unified global fantasy insights.
 */

import type { TrendFeedItem, TrendFeedType } from '@/lib/player-trend'
import type {
  DraftStrategyShift,
  MetaInsightHeadline as StrategyMetaHeadline,
  MetaOverviewCard,
  MetaSourceCoverage,
  PositionValueChange,
  WaiverStrategyTrend,
} from '@/lib/strategy-meta-engine'
import type { DynastyProjectionOutput } from '@/lib/dynasty-engine/types'
import type { WeatherImpactResult } from '@/lib/weather/weatherImpactEngine'
import type { NormalizedWeather } from '@/lib/weather/weatherService'

export interface GlobalFantasyInsightsInput {
  sport?: string
  leagueId?: string | null
  season?: number
  weekOrPeriod?: number
  trendLimit?: number
  metaWindowDays?: number
  leagueFormat?: string | null
  /** Optional precomputed weather + impact for AI narrative (start/sit, waivers). */
  weatherForAI?: {
    sport: string
    position: string
    weather: NormalizedWeather | null
    impact: WeatherImpactResult | null
  } | null
}

export interface TrendInsightLeader {
  playerId: string
  displayName: string | null
  position: string | null
  team: string | null
  trendType: TrendFeedType
  signalStrength: number
  recommendation: string
}

export interface TrendInsights {
  items: TrendFeedItem[]
  sport: string | null
  generatedAt: string
  trendTypeCounts: Record<TrendFeedType, number>
  averageSignalStrength: number | null
  strongestSignal: TrendInsightLeader | null
  error?: string
}

export interface MetaInsights {
  draftStrategyShifts: DraftStrategyShift[]
  positionValueChanges: PositionValueChange[]
  waiverStrategyTrends: WaiverStrategyTrend[]
  overviewCards: MetaOverviewCard[]
  headlines: StrategyMetaHeadline[]
  sourceCoverage: MetaSourceCoverage | null
  sport: string | null
  generatedAt: string
  averageConfidence: number | null
  topHeadline: StrategyMetaHeadline | null
  error?: string
}

export interface DynastyInsights {
  projections: DynastyProjectionOutput[]
  leagueId: string | null
  sport: string | null
  generatedAt: string
  contenderCount: number
  rebuildCount: number
  averageAgingRiskScore: number | null
  averageFutureAssetScore: number | null
  topWindowTeamId: string | null
  topWindowScore: number | null
  topFutureAssetTeamId: string | null
  error?: string
}

export interface SimulationMatchupInsightRow {
  simulationId: string
  leagueId: string | null
  weekOrPeriod: number
  teamAId: string | null
  teamBId: string | null
  expectedScoreA: number
  expectedScoreB: number
  winProbabilityA: number
  winProbabilityB: number
  iterations: number
  createdAt: string
}

export interface SimulationSeasonInsightRow {
  resultId: string
  leagueId: string
  teamId: string
  season: number
  weekOrPeriod: number
  playoffProbability: number
  championshipProbability: number
  expectedWins: number
  expectedRank: number
  simulationsRun: number
}

export interface SimulationInsights {
  matchupSimulations: SimulationMatchupInsightRow[]
  seasonSimulations: SimulationSeasonInsightRow[]
  leagueId: string | null
  season: number | null
  weekOrPeriod: number | null
  generatedAt: string
  topMatchupEdgeTeamId: string | null
  topMatchupWinProbability: number | null
  topPlayoffOddsTeamId: string | null
  topPlayoffProbability: number | null
  averageMatchupEdge: number | null
  averageExpectedMargin: number | null
  averagePlayoffProbability: number | null
  error?: string
}

export type GlobalFantasyInsightCategory =
  | 'trend'
  | 'meta'
  | 'dynasty'
  | 'simulation'
  | 'cross_system'

export type GlobalFantasyInsightPriority = 'high' | 'medium' | 'low'
export type GlobalFantasyInsightTone = 'positive' | 'neutral' | 'negative'
export type GlobalFantasySourceState = 'ready' | 'empty' | 'error' | 'unavailable'

export interface GlobalFantasyOverviewCard {
  id: string
  label: string
  value: string
  detail: string
  tone: GlobalFantasyInsightTone
}

export interface GlobalFantasyHeadline {
  id: string
  category: GlobalFantasyInsightCategory
  title: string
  summary: string
  confidence: number
  priority: GlobalFantasyInsightPriority
  relatedEntity: string | null
}

export interface GlobalFantasyActionItem {
  id: string
  category: GlobalFantasyInsightCategory
  priority: GlobalFantasyInsightPriority
  title: string
  recommendation: string
  rationale: string
  relatedEntity: string | null
}

export interface GlobalFantasySystemScores {
  trendHeat: number
  metaVolatility: number
  dynastyLeverage: number
  simulationConfidence: number
  opportunityIndex: number
  riskIndex: number
}

export interface GlobalFantasySourceStatus {
  trend: GlobalFantasySourceState
  meta: GlobalFantasySourceState
  dynasty: GlobalFantasySourceState
  simulation: GlobalFantasySourceState
  availableSources: number
  errorCount: number
  hasLeagueContext: boolean
}

export interface GlobalFantasyInsights {
  trend: TrendInsights
  meta: MetaInsights
  dynasty: DynastyInsights
  simulation: SimulationInsights
  sport: string | null
  leagueId: string | null
  season: number | null
  weekOrPeriod: number | null
  summary: string
  overviewCards: GlobalFantasyOverviewCard[]
  headlines: GlobalFantasyHeadline[]
  actionItems: GlobalFantasyActionItem[]
  systemScores: GlobalFantasySystemScores
  sourceStatus: GlobalFantasySourceStatus
  generatedAt: string
  /** Ready-to-paste line for LLM prompts when weather materially moves projections. */
  weatherContextForAI?: string
  /** Reference player values / rankings docs for Chimmy and downstream AI (sport-filtered when possible). */
  playerValuesContextForAI?: string
}

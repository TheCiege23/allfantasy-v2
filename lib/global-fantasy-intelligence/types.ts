/**
 * Global Fantasy Intelligence Engine (PROMPT 139) — types.
 * Inputs: trend detection, meta engine, dynasty projections, simulation results.
 * Output: global fantasy insights.
 */

import type { TrendFeedItem } from '@/lib/player-trend/TrendDetectionService'
import type { MetaAnalysisResult } from '@/lib/strategy-meta-engine'
import type { DynastyProjectionOutput } from '@/lib/dynasty-engine/types'

/** Input to the global fantasy intelligence engine. */
export interface GlobalFantasyInsightsInput {
  /** Sport filter (e.g. NFL, NBA). Uses sport-scope. */
  sport?: string
  /** League id for dynasty + simulation (optional). */
  leagueId?: string | null
  /** Season for simulation (e.g. 2025). */
  season?: number
  /** Week or period for simulation. */
  weekOrPeriod?: number
  /** Max trend items (default 20). */
  trendLimit?: number
  /** Meta analysis window days (default 30). */
  metaWindowDays?: number
  /** League format for strategy meta (e.g. dynasty_sf). */
  leagueFormat?: string | null
}

/** Trend detection slice of global insights. */
export interface TrendInsights {
  items: TrendFeedItem[]
  sport: string | null
  generatedAt: string
  error?: string
}

/** Meta engine slice (strategy meta: draft shifts, position value, waiver trends). */
export interface MetaInsights {
  draftStrategyShifts: MetaAnalysisResult['draftStrategyShifts']
  positionValueChanges: MetaAnalysisResult['positionValueChanges']
  waiverStrategyTrends: MetaAnalysisResult['waiverStrategyTrends']
  sport: string | null
  generatedAt: string
  error?: string
}

/** Dynasty projections slice (per-team when leagueId provided). */
export interface DynastyInsights {
  projections: DynastyProjectionOutput[]
  leagueId: string | null
  sport: string | null
  generatedAt: string
  error?: string
}

/** Simulation results slice (matchup + season when leagueId provided). */
export interface SimulationInsights {
  matchupSimulations: Array<{
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
  }>
  seasonSimulations: Array<{
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
  }>
  leagueId: string | null
  season: number | null
  weekOrPeriod: number | null
  generatedAt: string
  error?: string
}

/** Unified global fantasy insights (output of the engine). */
export interface GlobalFantasyInsights {
  /** Trend detection: hot/cold/breakout/sell-high feed. */
  trend: TrendInsights
  /** Meta engine: draft strategy shifts, position value, waiver trends. */
  meta: MetaInsights
  /** Dynasty projections: per-team 3yr/5yr, rebuild prob (when leagueId set). */
  dynasty: DynastyInsights
  /** Simulation results: matchup + season sims (when leagueId set). */
  simulation: SimulationInsights
  /** Input summary. */
  sport: string | null
  leagueId: string | null
  season: number | null
  weekOrPeriod: number | null
  generatedAt: string
}

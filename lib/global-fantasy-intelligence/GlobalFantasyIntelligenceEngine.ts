/**
 * Global Fantasy Intelligence Engine (PROMPT 139).
 * Combines all intelligence systems into one unified insight engine.
 *
 * Inputs: trend detection, meta engine, dynasty projections, simulation results.
 * Output: global fantasy insights.
 */
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { getTrendFeed } from '@/lib/player-trend/TrendDetectionService'
import { runMetaAnalysis } from '@/lib/strategy-meta-engine'
import { getDynastyProjectionsForLeague } from '@/lib/dynasty-engine/DynastyQueryService'
import { getSimulationSummaryForAI } from '@/lib/simulation-engine/SimulationQueryService'
import type {
  GlobalFantasyInsightsInput,
  GlobalFantasyInsights,
  TrendInsights,
  MetaInsights,
  DynastyInsights,
  SimulationInsights,
} from './types'

function normalizeSport(sport: string | undefined): string | null {
  if (!sport?.trim()) return null
  const u = sport.trim().toUpperCase()
  return (SUPPORTED_SPORTS as readonly string[]).includes(u) ? u : SUPPORTED_SPORTS[0]
}

/**
 * Fetch trend detection slice.
 */
async function fetchTrendInsights(
  sport: string | null,
  limit: number
): Promise<TrendInsights> {
  const generatedAt = new Date().toISOString()
  try {
    const items = await getTrendFeed({
      sport: sport ?? undefined,
      limit,
    })
    return { items, sport, generatedAt }
  } catch (e) {
    return {
      items: [],
      sport,
      generatedAt,
      error: e instanceof Error ? e.message : 'Trend fetch failed',
    }
  }
}

/**
 * Fetch meta engine slice (strategy meta).
 */
async function fetchMetaInsights(
  sport: string | null,
  windowDays: number,
  leagueFormat: string | null
): Promise<MetaInsights> {
  const generatedAt = new Date().toISOString()
  try {
    const result = await runMetaAnalysis({
      sport: sport ?? undefined,
      leagueFormat: leagueFormat ?? undefined,
      windowDays,
    })
    return {
      draftStrategyShifts: result.draftStrategyShifts,
      positionValueChanges: result.positionValueChanges,
      waiverStrategyTrends: result.waiverStrategyTrends,
      sport: result.sport,
      generatedAt,
    }
  } catch (e) {
    return {
      draftStrategyShifts: [],
      positionValueChanges: [],
      waiverStrategyTrends: [],
      sport,
      generatedAt,
      error: e instanceof Error ? e.message : 'Meta analysis failed',
    }
  }
}

/**
 * Fetch dynasty projections for a league.
 */
async function fetchDynastyInsights(
  leagueId: string | null,
  sport: string | null
): Promise<DynastyInsights> {
  const generatedAt = new Date().toISOString()
  if (!leagueId?.trim()) {
    return { projections: [], leagueId: null, sport, generatedAt }
  }
  try {
    const projections = await getDynastyProjectionsForLeague(
      leagueId,
      sport ?? undefined
    )
    return { projections, leagueId, sport, generatedAt }
  } catch (e) {
    return {
      projections: [],
      leagueId,
      sport,
      generatedAt,
      error: e instanceof Error ? e.message : 'Dynasty fetch failed',
    }
  }
}

/**
 * Fetch simulation results for a league.
 */
async function fetchSimulationInsights(
  leagueId: string | null,
  sport: string | null,
  season: number | null,
  weekOrPeriod: number | null
): Promise<SimulationInsights> {
  const generatedAt = new Date().toISOString()
  if (!leagueId?.trim() || season == null || weekOrPeriod == null) {
    return {
      matchupSimulations: [],
      seasonSimulations: [],
      leagueId: null,
      season: null,
      weekOrPeriod: null,
      generatedAt,
    }
  }
  try {
    const { matchupResults, seasonResults } = await getSimulationSummaryForAI(
      leagueId,
      sport ?? 'NFL',
      season,
      weekOrPeriod
    )
    return {
      matchupSimulations: (matchupResults ?? []).map((r) => ({
        simulationId: r.simulationId,
        leagueId: r.leagueId,
        weekOrPeriod: r.weekOrPeriod,
        teamAId: r.teamAId,
        teamBId: r.teamBId,
        expectedScoreA: r.expectedScoreA,
        expectedScoreB: r.expectedScoreB,
        winProbabilityA: r.winProbabilityA,
        winProbabilityB: r.winProbabilityB,
        iterations: r.iterations,
        createdAt: r.createdAt?.toISOString?.() ?? generatedAt,
      })),
      seasonSimulations: (seasonResults ?? []).map((r) => ({
        resultId: r.resultId,
        leagueId: r.leagueId,
        teamId: r.teamId,
        season: r.season,
        weekOrPeriod: r.weekOrPeriod,
        playoffProbability: r.playoffProbability,
        championshipProbability: r.championshipProbability,
        expectedWins: r.expectedWins,
        expectedRank: r.expectedRank,
        simulationsRun: r.simulationsRun,
      })),
      leagueId,
      season,
      weekOrPeriod,
      generatedAt,
    }
  } catch (e) {
    return {
      matchupSimulations: [],
      seasonSimulations: [],
      leagueId,
      season,
      weekOrPeriod,
      generatedAt,
      error: e instanceof Error ? e.message : 'Simulation fetch failed',
    }
  }
}

/**
 * Get global fantasy insights by combining trend detection, meta engine, dynasty projections, and simulation results.
 */
export async function getGlobalFantasyInsights(
  input: GlobalFantasyInsightsInput = {}
): Promise<GlobalFantasyInsights> {
  const sport = normalizeSport(input.sport)
  const leagueId = input.leagueId?.trim() || null
  const season = input.season ?? new Date().getFullYear()
  const weekOrPeriod = input.weekOrPeriod ?? 1
  const trendLimit = Math.min(100, Math.max(1, input.trendLimit ?? 20))
  const metaWindowDays = Math.min(90, Math.max(1, input.metaWindowDays ?? 30))

  const [trend, meta, dynasty, simulation] = await Promise.all([
    fetchTrendInsights(sport, trendLimit),
    fetchMetaInsights(sport, metaWindowDays, input.leagueFormat ?? null),
    fetchDynastyInsights(leagueId, sport),
    fetchSimulationInsights(leagueId, sport, leagueId ? season : null, leagueId ? weekOrPeriod : null),
  ])

  return {
    trend,
    meta,
    dynasty,
    simulation,
    sport,
    leagueId,
    season: leagueId ? season : null,
    weekOrPeriod: leagueId ? weekOrPeriod : null,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Supported sports (from sport-scope).
 */
export function getGlobalFantasyInsightsSupportedSports(): readonly string[] {
  return SUPPORTED_SPORTS
}

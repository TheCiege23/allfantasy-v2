/**
 * AnalyticsQueryLayer (PROMPT 138) — unified query API over the fantasy data warehouse.
 * Single entry point to query: player stats, league results, draft logs, trade logs, simulation outputs.
 */
import { prisma } from '@/lib/prisma'
import { normalizeSportForWarehouse } from './types'
import {
  getLeagueHistorySummary,
  getMatchupHistory,
  getStandingsHistory,
  getRosterSnapshotsForTeam,
  getPlayerGameFactsForPlayer,
  getDraftHistoryForLeague,
  getTransactionHistoryForLeague,
  type LeagueHistorySummary,
} from './LeagueHistoryAggregator'
import {
  getPlayerFantasyPointsByPeriod,
  getTeamPointsByPeriodForLeague,
  getStandingsBySeasonForLeague,
  getTransactionVolumeByLeague,
  getLeagueWarehouseSummaryForAI,
} from './WarehouseQueryService'

export type { LeagueHistorySummary }

export interface QueryPlayerStatsOptions {
  playerId: string
  sport: string
  season?: number
  fromWeek?: number
  toWeek?: number
  limit?: number
}

/**
 * Query player stats (game-level fantasy facts).
 */
export async function queryPlayerStats(options: QueryPlayerStatsOptions) {
  const sport = normalizeSportForWarehouse(options.sport)
  return getPlayerGameFactsForPlayer(options.playerId, sport, {
    season: options.season,
    fromWeek: options.fromWeek,
    toWeek: options.toWeek,
    limit: options.limit,
  })
}

/**
 * Query player fantasy points by period (for charts/trends).
 */
export async function queryPlayerFantasyPointsByPeriod(
  playerId: string,
  sport: string,
  season: number,
  weeks?: number[]
) {
  return getPlayerFantasyPointsByPeriod(
    playerId,
    normalizeSportForWarehouse(sport),
    season,
    weeks
  )
}

export interface QueryLeagueResultsOptions {
  leagueId: string
  season?: number
  weekOrPeriod?: number
}

/**
 * Query league results: matchups (head-to-head) and standings.
 */
export async function queryLeagueResults(options: QueryLeagueResultsOptions) {
  const { leagueId, season, weekOrPeriod } = options
  if (season == null) {
    const summary = await getLeagueHistorySummary(leagueId)
    const seasonNum = summary.season
    const [matchups, standings] = await Promise.all([
      seasonNum != null ? getMatchupHistory(leagueId, seasonNum, weekOrPeriod) : [],
      seasonNum != null ? getStandingsHistory(leagueId, seasonNum) : [],
    ])
    return { matchups, standings, season: seasonNum }
  }
  const [matchups, standings] = await Promise.all([
    getMatchupHistory(leagueId, season, weekOrPeriod),
    getStandingsHistory(leagueId, season),
  ])
  return { matchups, standings, season }
}

/**
 * Query standings by season for a league (cross-season).
 */
export async function queryStandingsBySeason(leagueId: string, seasons: number[]) {
  return getStandingsBySeasonForLeague(leagueId, seasons)
}

/**
 * Query team points by period for simulation inputs.
 */
export async function queryTeamPointsByPeriod(
  leagueId: string,
  season: number,
  weekOrPeriod?: number
) {
  return getTeamPointsByPeriodForLeague(leagueId, season, weekOrPeriod)
}

export interface QueryDraftLogsOptions {
  leagueId: string
  season?: number
}

/**
 * Query draft logs (all picks for a league/season).
 */
export async function queryDraftLogs(options: QueryDraftLogsOptions) {
  return getDraftHistoryForLeague(options.leagueId, options.season)
}

export interface QueryTradeLogsOptions {
  leagueId: string
  since?: Date
  limit?: number
}

/**
 * Query trade/transaction logs for a league.
 */
export async function queryTradeLogs(options: QueryTradeLogsOptions) {
  return getTransactionHistoryForLeague(
    options.leagueId,
    options.since,
    options.limit ?? 100
  )
}

/**
 * Query transaction volume by league (counts).
 */
export async function queryTransactionVolume(leagueIds: string[], since: Date) {
  return getTransactionVolumeByLeague(leagueIds, since)
}

export interface QuerySimulationOutputsOptions {
  leagueId: string
  sport: string
  season?: number
  weekOrPeriod?: number
  teamAId?: string
  teamBId?: string
}

/**
 * Query simulation outputs: matchup sims and/or season sim results.
 */
export async function querySimulationOutputs(options: QuerySimulationOutputsOptions) {
  const { leagueId, season, weekOrPeriod, teamAId, teamBId } = options
  const matchupWhere: { leagueId: string; weekOrPeriod?: number; teamAId?: string; teamBId?: string } = {
    leagueId,
  }
  if (weekOrPeriod != null) matchupWhere.weekOrPeriod = weekOrPeriod
  if (teamAId) matchupWhere.teamAId = teamAId
  if (teamBId) matchupWhere.teamBId = teamBId

  const [matchupSims, seasonSims] = await Promise.all([
    prisma.matchupSimulationResult.findMany({
      where: matchupWhere,
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    season != null && weekOrPeriod != null
      ? prisma.seasonSimulationResult.findMany({
          where: { leagueId, season, weekOrPeriod },
          orderBy: { expectedRank: 'asc' },
        })
      : [],
  ])
  return { matchupSimulations: matchupSims, seasonSimulations: seasonSims }
}

/**
 * Query roster snapshots for a team (lineup/bench by week).
 */
export async function queryRosterSnapshots(
  leagueId: string,
  teamId: string,
  season?: number,
  fromWeek?: number,
  toWeek?: number
) {
  return getRosterSnapshotsForTeam(leagueId, teamId, season, fromWeek, toWeek)
}

/**
 * Get full league warehouse summary (counts and AI payload).
 */
export async function getLeagueSummary(leagueId: string, season?: number) {
  const summary = await getLeagueHistorySummary(leagueId, season ? { season } : undefined)
  return summary
}

/**
 * Get AI-ready warehouse summary for a league (narrative/prompt injection).
 */
export async function getLeagueSummaryForAI(leagueId: string, season?: number) {
  return getLeagueWarehouseSummaryForAI(leagueId, season)
}

/**
 * AnalyticsQueryLayer — facade for all warehouse queries.
 */
export const AnalyticsQueryLayer = {
  queryPlayerStats,
  queryPlayerFantasyPointsByPeriod,
  queryLeagueResults,
  queryStandingsBySeason,
  queryTeamPointsByPeriod,
  queryDraftLogs,
  queryTradeLogs,
  queryTransactionVolume,
  querySimulationOutputs,
  queryRosterSnapshots,
  getLeagueSummary,
  getLeagueSummaryForAI,
}

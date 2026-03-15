/**
 * Data warehouse pipelines — automated ingestion and backfill.
 */

import { generateGameFactsFromExistingStats } from '../HistoricalFactGenerator'
import { generateMatchupFactsFromLeague, generateStandingFactsFromLeague, generateRosterSnapshotsFromLeague, generateTransactionFactsFromLeague } from '../HistoricalFactGenerator'
import { normalizeSportForWarehouse } from '../types'

export interface GameStatsPipelineResult {
  sport: string
  season: number
  weekOrRound: number
  playerFacts: number
  teamFacts: number
}

/**
 * Pipeline: ingest game stats from existing PlayerGameStat/TeamGameStat into warehouse.
 */
export async function runGameStatsIngestionPipeline(
  sport: string,
  season: number,
  weekOrRound: number
): Promise<GameStatsPipelineResult> {
  const sportNorm = normalizeSportForWarehouse(sport)
  const { playerFacts, teamFacts } = await generateGameFactsFromExistingStats(sportNorm, season, weekOrRound)
  return { sport: sportNorm, season, weekOrRound, playerFacts, teamFacts }
}

export interface MatchupScoringPipelineResult {
  leagueId: string
  season: number
  week: number
  matchupCount: number
}

/**
 * Pipeline: generate matchup facts from league TeamPerformance.
 */
export async function runMatchupScoringPipeline(
  leagueId: string,
  season: number,
  week: number
): Promise<MatchupScoringPipelineResult> {
  const matchupCount = await generateMatchupFactsFromLeague(leagueId, season, week)
  return { leagueId, season, week, matchupCount }
}

export interface RosterSnapshotPipelineResult {
  leagueId: string
  weekOrPeriod: number
  season?: number
  snapshotCount: number
}

/**
 * Pipeline: generate roster snapshots from current Roster state.
 */
export async function runRosterSnapshotPipeline(
  leagueId: string,
  weekOrPeriod: number,
  season?: number
): Promise<RosterSnapshotPipelineResult> {
  const snapshotCount = await generateRosterSnapshotsFromLeague(leagueId, weekOrPeriod, season)
  return { leagueId, weekOrPeriod, season, snapshotCount }
}

export interface StandingsPipelineResult {
  leagueId: string
  season: number
  standingCount: number
}

/**
 * Pipeline: generate season standing facts from LeagueTeam.
 */
export async function runStandingsIngestionPipeline(
  leagueId: string,
  season: number
): Promise<StandingsPipelineResult> {
  const standingCount = await generateStandingFactsFromLeague(leagueId, season)
  return { leagueId, season, standingCount }
}

export interface TransactionPipelineResult {
  leagueId: string
  transactionCount: number
}

/**
 * Pipeline: generate transaction facts from WaiverTransaction.
 */
export async function runTransactionIngestionPipeline(
  leagueId: string,
  since?: Date
): Promise<TransactionPipelineResult> {
  const transactionCount = await generateTransactionFactsFromLeague(leagueId, since)
  return { leagueId, transactionCount }
}

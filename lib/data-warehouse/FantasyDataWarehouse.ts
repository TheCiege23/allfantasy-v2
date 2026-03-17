/**
 * FantasyDataWarehouse (PROMPT 138) — centralized analytics storage.
 * Single entry point to store: player stats, league results, draft logs, trade logs, simulation outputs.
 */
import { prisma } from '@/lib/prisma'
import { WarehouseIngestionService } from './WarehouseIngestionService'
import type {
  PlayerGameFactInput,
  TeamGameFactInput,
  MatchupFactInput,
  SeasonStandingFactInput,
  DraftFactInput,
  TransactionFactInput,
} from './types'
import { normalizeSportForWarehouse } from './types'

export interface StorePlayerStatsInput extends Omit<PlayerGameFactInput, 'sport'> {
  sport: string
}

export interface StoreLeagueResultMatchupInput extends Omit<MatchupFactInput, 'sport'> {
  sport: string
}

export interface StoreLeagueResultStandingInput extends Omit<SeasonStandingFactInput, 'sport'> {
  sport: string
}

export interface StoreDraftLogInput extends Omit<DraftFactInput, 'sport'> {
  sport: string
}

export interface StoreTradeLogInput extends Omit<TransactionFactInput, 'sport'> {
  sport: string
}

export interface StoreMatchupSimulationInput {
  sport: string
  leagueId: string | null
  weekOrPeriod: number
  teamAId: string | null
  teamBId: string | null
  expectedScoreA: number
  expectedScoreB: number
  winProbabilityA: number
  winProbabilityB: number
  scoreDistributionA?: Record<string, unknown> | null
  scoreDistributionB?: Record<string, unknown> | null
  iterations?: number
}

export interface StoreSeasonSimulationInput {
  sport: string
  leagueId: string
  teamId: string
  season: number
  weekOrPeriod: number
  playoffProbability?: number
  championshipProbability?: number
  expectedWins?: number
  expectedRank?: number
  simulationsRun?: number
}

const ingestion = new WarehouseIngestionService()

/**
 * Store a single player game stat (fantasy stats per game).
 */
export async function storePlayerStats(input: StorePlayerStatsInput): Promise<string> {
  return ingestion.ingestPlayerGameFact({
    ...input,
    sport: normalizeSportForWarehouse(input.sport),
  } as PlayerGameFactInput)
}

/**
 * Store multiple player game stats in one go.
 */
export async function storePlayerStatsBatch(inputs: StorePlayerStatsInput[]): Promise<string[]> {
  const ids: string[] = []
  for (const input of inputs) {
    ids.push(await storePlayerStats(input))
  }
  return ids
}

/**
 * Store a league result: one head-to-head matchup fact.
 */
export async function storeLeagueResultMatchup(input: StoreLeagueResultMatchupInput): Promise<string> {
  return ingestion.ingestMatchupFact({
    ...input,
    sport: normalizeSportForWarehouse(input.sport),
  } as MatchupFactInput)
}

/**
 * Store a league result: one season standing fact (per team).
 */
export async function storeLeagueResultStanding(input: StoreLeagueResultStandingInput): Promise<string> {
  return ingestion.ingestSeasonStandingFact({
    ...input,
    sport: normalizeSportForWarehouse(input.sport),
  } as SeasonStandingFactInput)
}

/**
 * Store league results: multiple matchups and/or standings. Returns counts.
 */
export async function storeLeagueResults(opts: {
  matchups?: StoreLeagueResultMatchupInput[]
  standings?: StoreLeagueResultStandingInput[]
}): Promise<{ matchupIds: string[]; standingIds: string[] }> {
  const matchupIds: string[] = []
  const standingIds: string[] = []
  if (opts.matchups?.length) {
    for (const m of opts.matchups) matchupIds.push(await storeLeagueResultMatchup(m))
  }
  if (opts.standings?.length) {
    for (const s of opts.standings) standingIds.push(await storeLeagueResultStanding(s))
  }
  return { matchupIds, standingIds }
}

/**
 * Store a single draft pick (draft log entry).
 */
export async function storeDraftLog(input: StoreDraftLogInput): Promise<string> {
  return ingestion.ingestDraftFact({
    ...input,
    sport: normalizeSportForWarehouse(input.sport),
  } as DraftFactInput)
}

/**
 * Store multiple draft picks (full draft log).
 */
export async function storeDraftLogsBatch(inputs: StoreDraftLogInput[]): Promise<string[]> {
  const ids: string[] = []
  for (const input of inputs) {
    ids.push(await storeDraftLog(input))
  }
  return ids
}

/**
 * Store a single trade/transaction log entry.
 */
export async function storeTradeLog(input: StoreTradeLogInput): Promise<string> {
  return ingestion.ingestTransactionFact({
    ...input,
    sport: normalizeSportForWarehouse(input.sport),
  } as TransactionFactInput)
}

/**
 * Store multiple trade/transaction log entries.
 */
export async function storeTradeLogsBatch(inputs: StoreTradeLogInput[]): Promise<string[]> {
  const ids: string[] = []
  for (const input of inputs) {
    ids.push(await storeTradeLog(input))
  }
  return ids
}

/**
 * Store a matchup simulation output (head-to-head sim result).
 */
export async function storeMatchupSimulationOutput(input: StoreMatchupSimulationInput): Promise<string> {
  const sport = normalizeSportForWarehouse(input.sport)
  const row = await prisma.matchupSimulationResult.create({
    data: {
      sport,
      leagueId: input.leagueId ?? undefined,
      weekOrPeriod: input.weekOrPeriod,
      teamAId: input.teamAId ?? undefined,
      teamBId: input.teamBId ?? undefined,
      expectedScoreA: input.expectedScoreA,
      expectedScoreB: input.expectedScoreB,
      winProbabilityA: input.winProbabilityA,
      winProbabilityB: input.winProbabilityB,
      scoreDistributionA: input.scoreDistributionA ?? undefined,
      scoreDistributionB: input.scoreDistributionB ?? undefined,
      iterations: input.iterations ?? 2000,
    },
  })
  return row.simulationId
}

/**
 * Store a season simulation output (per-team playoff/championship odds, expected rank).
 */
export async function storeSeasonSimulationOutput(input: StoreSeasonSimulationInput): Promise<string> {
  const sport = normalizeSportForWarehouse(input.sport)
  const row = await prisma.seasonSimulationResult.create({
    data: {
      sport,
      leagueId: input.leagueId,
      teamId: input.teamId,
      season: input.season,
      weekOrPeriod: input.weekOrPeriod,
      playoffProbability: input.playoffProbability ?? 0,
      championshipProbability: input.championshipProbability ?? 0,
      expectedWins: input.expectedWins ?? 0,
      expectedRank: input.expectedRank ?? 0,
      simulationsRun: input.simulationsRun ?? 0,
    },
  })
  return row.resultId
}

/**
 * Store simulation outputs: matchup and/or season results. Returns IDs.
 */
export async function storeSimulationOutputs(opts: {
  matchup?: StoreMatchupSimulationInput
  seasonResults?: StoreSeasonSimulationInput[]
}): Promise<{ matchupId?: string; seasonResultIds: string[] }> {
  let matchupId: string | undefined
  const seasonResultIds: string[] = []
  if (opts.matchup) {
    matchupId = await storeMatchupSimulationOutput(opts.matchup)
  }
  if (opts.seasonResults?.length) {
    for (const s of opts.seasonResults) {
      seasonResultIds.push(await storeSeasonSimulationOutput(s))
    }
  }
  return { matchupId, seasonResultIds }
}

/**
 * FantasyDataWarehouse — facade for all storage operations.
 */
export const FantasyDataWarehouse = {
  storePlayerStats,
  storePlayerStatsBatch,
  storeLeagueResultMatchup,
  storeLeagueResultStanding,
  storeLeagueResults,
  storeDraftLog,
  storeDraftLogsBatch,
  storeTradeLog,
  storeTradeLogsBatch,
  storeMatchupSimulationOutput,
  storeSeasonSimulationOutput,
  storeSimulationOutputs,
}

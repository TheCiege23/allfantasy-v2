/**
 * Warehouse backfill orchestrator — runs ingestion pipelines for leagues and/or game stats.
 * Call from POST /api/admin/warehouse/backfill or a scheduled job.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { normalizeSportForWarehouse } from './types'
import {
  runGameStatsIngestionPipeline,
  runMatchupScoringPipeline,
  runRosterSnapshotPipeline,
  runStandingsIngestionPipeline,
  runTransactionIngestionPipeline,
} from './pipelines'

export type BackfillPipeline = 'gameStats' | 'matchups' | 'standings' | 'rosterSnapshots' | 'transactions'

export interface BackfillOptions {
  /** Specific league IDs; if empty, all leagues matching sport/season are used */
  leagueIds?: string[]
  /** Filter leagues by sport (e.g. NFL) */
  sport?: string
  /** Season year (e.g. 2024). Used for standings, matchups, roster; and for game stats if run */
  season?: number
  /** Week numbers to run for matchups/roster (e.g. [1,2,3,...,14]). If omitted, 1–18 are used for league backfill */
  weeks?: number[]
  /** Which pipelines to run. Default: all except gameStats (gameStats requires sport+season+weeks) */
  pipelines?: BackfillPipeline[]
  /** If true, only report what would be run; do not write */
  dryRun?: boolean
}

export interface BackfillResult {
  ok: boolean
  dryRun: boolean
  leaguesProcessed: number
  gameStats?: { sport: string; season: number; week: number; playerFacts: number; teamFacts: number }[]
  standings?: { leagueId: string; season: number; standingCount: number }[]
  matchups?: { leagueId: string; season: number; week: number; matchupCount: number }[]
  rosterSnapshots?: { leagueId: string; weekOrPeriod: number; snapshotCount: number }[]
  transactions?: { leagueId: string; transactionCount: number }[]
  errors: string[]
}

export async function runWarehouseBackfill(options: BackfillOptions): Promise<BackfillResult> {
  const {
    leagueIds: inputLeagueIds = [],
    sport: inputSport,
    season: inputSeason,
    weeks: inputWeeks,
    pipelines = ['standings', 'matchups', 'rosterSnapshots', 'transactions'],
    dryRun = false,
  } = options

  const errors: string[] = []
  const gameStatsResults: BackfillResult['gameStats'] = []
  const standingsResults: BackfillResult['standings'] = []
  const matchupsResults: BackfillResult['matchups'] = []
  const rosterSnapshotsResults: BackfillResult['rosterSnapshots'] = []
  const transactionsResults: BackfillResult['transactions'] = []

  const runGameStats = pipelines.includes('gameStats')
  const runMatchups = pipelines.includes('matchups')
  const runStandings = pipelines.includes('standings')
  const runRosterSnapshots = pipelines.includes('rosterSnapshots')
  const runTransactions = pipelines.includes('transactions')

  let leagueIds = inputLeagueIds.slice()

  if (leagueIds.length === 0) {
    const where: Prisma.LeagueWhereInput = {}
    if (inputSport) where.sport = normalizeSportForWarehouse(inputSport) as Prisma.LeagueWhereInput['sport']
    if (inputSeason != null) where.season = inputSeason
    const leagues = await prisma.league.findMany({
      where,
      select: { id: true },
    })
    leagueIds = leagues.map((l) => l.id)
  }

  const season = inputSeason ?? new Date().getFullYear()
  const weeks = inputWeeks?.length ? inputWeeks : Array.from({ length: 18 }, (_, i) => i + 1)

  for (const leagueId of leagueIds) {
    try {
      const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { sport: true, season: true } })
      if (!league) {
        errors.push(`League not found: ${leagueId}`)
        continue
      }
      const leagueSeason = inputSeason ?? league.season ?? season

      if (runStandings && !dryRun) {
        const r = await runStandingsIngestionPipeline(leagueId, leagueSeason)
        standingsResults.push(r)
      } else if (runStandings && dryRun) {
        standingsResults.push({ leagueId, season: leagueSeason, standingCount: 0 })
      }

      if (runTransactions && !dryRun) {
        const r = await runTransactionIngestionPipeline(leagueId)
        transactionsResults.push(r)
      } else if (runTransactions && dryRun) {
        transactionsResults.push({ leagueId, transactionCount: 0 })
      }

      if (runMatchups || runRosterSnapshots) {
        for (const week of weeks) {
          if (runMatchups && !dryRun) {
            const r = await runMatchupScoringPipeline(leagueId, leagueSeason, week)
            matchupsResults.push(r)
          } else if (runMatchups && dryRun) {
            matchupsResults.push({ leagueId, season: leagueSeason, week, matchupCount: 0 })
          }
          if (runRosterSnapshots && !dryRun) {
            const r = await runRosterSnapshotPipeline(leagueId, week, leagueSeason)
            rosterSnapshotsResults.push(r)
          } else if (runRosterSnapshots && dryRun) {
            rosterSnapshotsResults.push({ leagueId, weekOrPeriod: week, snapshotCount: 0 })
          }
        }
      }
    } catch (e) {
      errors.push(`${leagueId}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  if (runGameStats && inputSport && inputSeason != null) {
    const sportNorm = normalizeSportForWarehouse(inputSport)
    for (const week of weeks) {
      try {
        if (!dryRun) {
          const r = await runGameStatsIngestionPipeline(sportNorm, inputSeason, week)
          gameStatsResults.push({ sport: r.sport, season: r.season, week: r.weekOrRound, playerFacts: r.playerFacts, teamFacts: r.teamFacts })
        } else {
          gameStatsResults.push({ sport: sportNorm, season: inputSeason, week, playerFacts: 0, teamFacts: 0 })
        }
      } catch (e) {
        errors.push(`gameStats ${sportNorm} ${inputSeason} w${week}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  return {
    ok: errors.length === 0,
    dryRun,
    leaguesProcessed: leagueIds.length,
    gameStats: runGameStats ? gameStatsResults : undefined,
    standings: runStandings ? standingsResults : undefined,
    matchups: runMatchups ? matchupsResults : undefined,
    rosterSnapshots: runRosterSnapshots ? rosterSnapshotsResults : undefined,
    transactions: runTransactions ? transactionsResults : undefined,
    errors,
  }
}

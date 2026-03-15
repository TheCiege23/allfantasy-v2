/**
 * LeagueHistoryAggregator — reconstructs and aggregates league history from warehouse facts.
 * Powers historical league insights, drill-downs, and storytelling.
 */

import { prisma } from '@/lib/prisma'
import { DEFAULT_SPORT } from '@/lib/sport-scope'
import { normalizeSportForWarehouse } from './types'

export interface LeagueHistorySummary {
  leagueId: string
  sport: string
  season?: number
  matchupCount: number
  standingCount: number
  rosterSnapshotCount: number
  draftFactCount: number
  transactionCount: number
  playerGameFactCount: number
  teamGameFactCount: number
}

export async function getLeagueHistorySummary(
  leagueId: string,
  options?: { season?: number; fromWeek?: number; toWeek?: number }
): Promise<LeagueHistorySummary> {
  const league = await prisma.league.findUnique({ where: { id: leagueId } })
  const sport = league ? normalizeSportForWarehouse(league.sport) : DEFAULT_SPORT
  const season = options?.season ?? league?.season ?? null

  const [matchupCount, standingCount, rosterSnapshotCount, draftFactCount, transactionCount, playerGameFactCount, teamGameFactCount] = await Promise.all([
    prisma.matchupFact.count({
      where: {
        leagueId,
        ...(season != null ? { season } : {}),
        ...(options?.fromWeek != null && options?.toWeek != null
          ? { weekOrPeriod: { gte: options.fromWeek, lte: options.toWeek } }
          : {}),
      },
    }),
    prisma.seasonStandingFact.count({
      where: { leagueId, ...(season != null ? { season } : {}) },
    }),
    prisma.rosterSnapshot.count({
      where: { leagueId, ...(season != null ? { season } : {}) },
    }),
    prisma.draftFact.count({
      where: { leagueId, ...(season != null ? { season } : {}) },
    }),
    prisma.transactionFact.count({ where: { leagueId } }),
    prisma.playerGameFact.count({
      where: { sport, ...(season != null ? { season } : {}) },
    }),
    prisma.teamGameFact.count({
      where: { sport, ...(season != null ? { season } : {}) },
    }),
  ])

  return {
    leagueId,
    sport,
    season: season ?? undefined,
    matchupCount,
    standingCount,
    rosterSnapshotCount,
    draftFactCount,
    transactionCount,
    playerGameFactCount,
    teamGameFactCount,
  }
}

export async function getMatchupHistory(
  leagueId: string,
  season: number,
  weekOrPeriod?: number
) {
  return prisma.matchupFact.findMany({
    where: { leagueId, season, ...(weekOrPeriod != null ? { weekOrPeriod } : {}) },
    orderBy: [{ weekOrPeriod: 'asc' }, { matchupId: 'asc' }],
  })
}

export async function getStandingsHistory(
  leagueId: string,
  season: number
) {
  return prisma.seasonStandingFact.findMany({
    where: { leagueId, season },
    orderBy: { rank: 'asc' },
  })
}

export async function getRosterSnapshotsForTeam(
  leagueId: string,
  teamId: string,
  season?: number,
  fromWeek?: number,
  toWeek?: number
) {
  return prisma.rosterSnapshot.findMany({
    where: {
      leagueId,
      teamId,
      ...(season != null ? { season } : {}),
      ...(fromWeek != null && toWeek != null ? { weekOrPeriod: { gte: fromWeek, lte: toWeek } } : {}),
    },
    orderBy: { weekOrPeriod: 'asc' },
  })
}

export async function getPlayerGameFactsForPlayer(
  playerId: string,
  sport: string,
  options?: { season?: number; fromWeek?: number; toWeek?: number; limit?: number }
) {
  const sportNorm = normalizeSportForWarehouse(sport)
  return prisma.playerGameFact.findMany({
    where: {
      playerId,
      sport: sportNorm,
      ...(options?.season != null ? { season: options.season } : {}),
      ...(options?.fromWeek != null && options?.toWeek != null
        ? { weekOrRound: { gte: options.fromWeek, lte: options.toWeek } }
        : {}),
    },
    orderBy: [{ season: 'desc' }, { weekOrRound: 'desc' }],
    take: options?.limit ?? 50,
  })
}

export async function getDraftHistoryForLeague(
  leagueId: string,
  season?: number
) {
  return prisma.draftFact.findMany({
    where: { leagueId, ...(season != null ? { season } : {}) },
    orderBy: [{ round: 'asc' }, { pickNumber: 'asc' }],
  })
}

export async function getTransactionHistoryForLeague(
  leagueId: string,
  since?: Date,
  limit = 100
) {
  return prisma.transactionFact.findMany({
    where: { leagueId, ...(since ? { createdAt: { gte: since } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

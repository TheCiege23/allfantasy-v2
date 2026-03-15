/**
 * WarehouseIngestionService — writes fact records into the data warehouse.
 * Used by pipelines and HistoricalFactGenerator.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type {
  PlayerGameFactInput,
  TeamGameFactInput,
  RosterSnapshotInput,
  MatchupFactInput,
  DraftFactInput,
  TransactionFactInput,
  SeasonStandingFactInput,
} from './types'
import { normalizeSportForWarehouse } from './types'

export class WarehouseIngestionService {
  async ingestPlayerGameFact(input: PlayerGameFactInput): Promise<string> {
    const sport = normalizeSportForWarehouse(input.sport)
    const row = await prisma.playerGameFact.create({
      data: {
        playerId: input.playerId,
        sport,
        gameId: input.gameId,
        teamId: input.teamId ?? null,
        opponentTeamId: input.opponentTeamId ?? null,
        statPayload: input.statPayload as object,
        normalizedStats: input.normalizedStats as object,
        fantasyPoints: input.fantasyPoints,
        scoringPeriod: input.scoringPeriod,
        season: input.season ?? null,
        weekOrRound: input.weekOrRound ?? null,
      },
    })
    return row.factId
  }

  async ingestTeamGameFact(input: TeamGameFactInput): Promise<string> {
    const sport = normalizeSportForWarehouse(input.sport)
    const row = await prisma.teamGameFact.create({
      data: {
        teamId: input.teamId,
        sport,
        gameId: input.gameId,
        pointsScored: input.pointsScored,
        opponentPoints: input.opponentPoints,
        result: input.result ?? null,
        season: input.season ?? null,
        weekOrRound: input.weekOrRound ?? null,
      },
    })
    return row.factId
  }

  async ingestRosterSnapshot(input: RosterSnapshotInput): Promise<string> {
    const sport = normalizeSportForWarehouse(input.sport)
    const row = await prisma.rosterSnapshot.create({
      data: {
        leagueId: input.leagueId,
        teamId: input.teamId,
        sport,
        weekOrPeriod: input.weekOrPeriod,
        season: input.season ?? null,
        rosterPlayers: input.rosterPlayers as object,
        lineupPlayers: input.lineupPlayers as object,
        benchPlayers: input.benchPlayers as object,
      },
    })
    return row.snapshotId
  }

  async ingestMatchupFact(input: MatchupFactInput): Promise<string> {
    const sport = normalizeSportForWarehouse(input.sport)
    const row = await prisma.matchupFact.create({
      data: {
        leagueId: input.leagueId,
        sport,
        weekOrPeriod: input.weekOrPeriod,
        teamA: input.teamA,
        teamB: input.teamB,
        scoreA: input.scoreA,
        scoreB: input.scoreB,
        winnerTeamId: input.winnerTeamId ?? null,
        season: input.season ?? null,
      },
    })
    return row.matchupId
  }

  async ingestDraftFact(input: DraftFactInput): Promise<string> {
    const sport = normalizeSportForWarehouse(input.sport)
    const row = await prisma.draftFact.create({
      data: {
        leagueId: input.leagueId,
        sport,
        round: input.round,
        pickNumber: input.pickNumber,
        playerId: input.playerId,
        managerId: input.managerId ?? null,
        season: input.season ?? null,
      },
    })
    return row.draftId
  }

  async ingestTransactionFact(input: TransactionFactInput): Promise<string> {
    const sport = normalizeSportForWarehouse(input.sport)
    const row = await prisma.transactionFact.create({
      data: {
        leagueId: input.leagueId,
        sport,
        type: input.type,
        playerId: input.playerId ?? null,
        managerId: input.managerId ?? null,
        rosterId: input.rosterId ?? null,
        payload: input.payload != null ? (input.payload as Prisma.InputJsonValue) : undefined,
        season: input.season ?? null,
        weekOrPeriod: input.weekOrPeriod ?? null,
      },
    })
    return row.transactionId
  }

  async ingestSeasonStandingFact(input: SeasonStandingFactInput): Promise<string> {
    const sport = normalizeSportForWarehouse(input.sport)
    const row = await prisma.seasonStandingFact.upsert({
      where: {
        uniq_dw_standing_league_season_team: {
          leagueId: input.leagueId,
          season: input.season,
          teamId: input.teamId,
        },
      },
      create: {
        leagueId: input.leagueId,
        sport,
        season: input.season,
        teamId: input.teamId,
        wins: input.wins,
        losses: input.losses,
        ties: input.ties,
        pointsFor: input.pointsFor,
        pointsAgainst: input.pointsAgainst,
        rank: input.rank ?? null,
      },
      update: {
        wins: input.wins,
        losses: input.losses,
        ties: input.ties,
        pointsFor: input.pointsFor,
        pointsAgainst: input.pointsAgainst,
        rank: input.rank ?? null,
      },
    })
    return row.standingId
  }
}

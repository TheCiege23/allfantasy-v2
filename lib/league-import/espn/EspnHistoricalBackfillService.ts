import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildLeagueGraph } from '@/lib/league-intelligence-graph'
import { rebuildHallOfFame } from '@/lib/rankings-engine/hall-of-fame'
import { persistDynastySeason, persistStandings } from '@/lib/dynasty-import/normalize-historical'
import { fetchEspnLeagueForImport } from './EspnLeagueFetchService'
import type { EspnImportPayload, EspnImportTeam } from '@/lib/league-import/adapters/espn/types'

const SEASON_END_ROSTER_SNAPSHOT_PERIOD = 0

interface EspnSnapshotPlayer {
  id: string
  name: string | null
  position: string | null
  team: string | null
  bucket: 'starter' | 'bench'
  ownerId: string
  ownerName: string
  rosterId: string
}

export interface EspnHistoricalBackfillSummary {
  attempted: boolean
  skipped: boolean
  reason?: string
  seasonsDiscovered?: number
  seasonsImported?: number
  standingsPersisted?: number
  rosterSnapshotsPersisted?: number
  matchupFactsPersisted?: number
  graph?: {
    refreshed: boolean
    nodeCount?: number
    edgeCount?: number
    snapshotId?: string
    error?: string
  }
  hallOfFame?: {
    refreshed: boolean
    count?: number
    error?: string
  }
  error?: string
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Unknown error'
}

function getSeasonFromPayload(payload: EspnImportPayload): number | null {
  return payload.league.season ?? null
}

function buildEspnSeasonMetadata(payload: EspnImportPayload): Record<string, unknown> {
  return {
    sourceProvider: 'espn',
    importedAt: new Date().toISOString(),
    leagueName: payload.league.name,
    leagueId: payload.league.leagueId,
    sport: payload.league.sport,
    season: payload.league.season,
    size: payload.league.size,
    currentWeek: payload.league.currentWeek,
    isFinished: payload.league.isFinished,
    playoffTeamCount: payload.league.playoffTeamCount,
    regularSeasonLength: payload.league.regularSeasonLength,
    scoringType: payload.settings?.scoringType ?? null,
    draftType: payload.settings?.draftType ?? null,
    scoringItems: payload.settings?.scoringItems ?? [],
    lineupSlotCounts: payload.settings?.lineupSlotCounts ?? [],
    waiverSettings: {
      usesFaab: payload.settings?.usesFaab ?? null,
      acquisitionBudget: payload.settings?.acquisitionBudget ?? null,
      waiverProcessDay: payload.settings?.waiverProcessDay ?? null,
    },
    previousSeasons: payload.previousSeasons,
    rawSettings: payload.settings?.raw ?? null,
  }
}

function buildSnapshotPlayers(team: EspnImportTeam): EspnSnapshotPlayer[] {
  const starterIds = new Set(team.starterPlayerIds)
  const reserveIds = new Set(team.reservePlayerIds)
  const allIds = new Set<string>([...team.rosterPlayerIds, ...team.starterPlayerIds, ...team.reservePlayerIds])

  return Array.from(allIds).map((playerId) => {
    const player = team.playerMap[playerId]
    return {
      id: playerId,
      name: player?.name ?? null,
      position: player?.position ?? null,
      team: player?.team ?? null,
      bucket: starterIds.has(playerId) ? 'starter' : reserveIds.has(playerId) ? 'bench' : 'bench',
      ownerId: team.managerId || team.teamId,
      ownerName: team.managerName,
      rosterId: team.teamId,
    }
  })
}

function inferChampionFromEspnStandings(payload: EspnImportPayload, team: EspnImportTeam): boolean {
  if (!payload.league.isFinished) return false
  return team.rank === 1
}

async function persistEspnSeasonWarehouseFacts(args: {
  leagueId: string
  payload: EspnImportPayload
}): Promise<{
  rosterSnapshotsPersisted: number
  matchupFactsPersisted: number
}> {
  const season = getSeasonFromPayload(args.payload)
  const snapshotCreates = args.payload.teams.map((team) => {
    const rosterPlayers = buildSnapshotPlayers(team)
    const lineupPlayers = rosterPlayers.filter((player) => player.bucket === 'starter')
    const benchPlayers = rosterPlayers.filter((player) => player.bucket !== 'starter')

    return prisma.rosterSnapshot.create({
      data: {
        leagueId: args.leagueId,
        teamId: team.teamId,
        sport: args.payload.league.sport,
        weekOrPeriod: SEASON_END_ROSTER_SNAPSHOT_PERIOD,
        season,
        rosterPlayers: rosterPlayers as unknown as Prisma.InputJsonValue,
        lineupPlayers: lineupPlayers as unknown as Prisma.InputJsonValue,
        benchPlayers: benchPlayers as unknown as Prisma.InputJsonValue,
      },
    })
  })

  const matchupCreates = args.payload.schedule.flatMap((week) =>
    week.matchups.map((matchup) =>
      prisma.matchupFact.create({
        data: {
          leagueId: args.leagueId,
          sport: args.payload.league.sport,
          weekOrPeriod: week.week,
          teamA: matchup.teamId1,
          teamB: matchup.teamId2,
          scoreA: matchup.points1 ?? 0,
          scoreB: matchup.points2 ?? 0,
          winnerTeamId:
            matchup.points1 != null && matchup.points2 != null && matchup.points1 !== matchup.points2
              ? matchup.points1 > matchup.points2
                ? matchup.teamId1
                : matchup.teamId2
              : null,
          season,
        },
      })
    )
  )

  await prisma.$transaction([
    prisma.rosterSnapshot.deleteMany({
      where: {
        leagueId: args.leagueId,
        season,
        weekOrPeriod: SEASON_END_ROSTER_SNAPSHOT_PERIOD,
      },
    }),
    prisma.matchupFact.deleteMany({
      where: {
        leagueId: args.leagueId,
        season,
      },
    }),
    ...snapshotCreates,
    ...matchupCreates,
  ])

  return {
    rosterSnapshotsPersisted: snapshotCreates.length,
    matchupFactsPersisted: matchupCreates.length,
  }
}

export async function syncEspnHistoricalBackfillAfterImport(args: {
  leagueId: string
  userId: string
}): Promise<EspnHistoricalBackfillSummary> {
  const league = await prisma.league.findUnique({
    where: { id: args.leagueId },
    select: {
      id: true,
      platform: true,
      platformLeagueId: true,
      season: true,
    },
  })

  if (!league) {
    return {
      attempted: false,
      skipped: true,
      reason: 'League not found.',
    }
  }

  if (league.platform !== 'espn' || !league.platformLeagueId) {
    return {
      attempted: false,
      skipped: true,
      reason: 'ESPN historical backfill only applies to ESPN leagues with a platformLeagueId.',
    }
  }

  try {
    const currentSourceInput = league.season ? `${league.season}:${league.platformLeagueId}` : league.platformLeagueId
    const currentPayload = await fetchEspnLeagueForImport(args.userId, currentSourceInput, {
      includePreviousSeasons: true,
      maxPreviousSeasons: 8,
    })
    const additionalPayloads = await Promise.all(
      currentPayload.previousSeasons.map((season) =>
        fetchEspnLeagueForImport(args.userId, `${season.season}:${season.sourceLeagueId}`, {
          includePreviousSeasons: false,
        })
      )
    )

    const payloads = [currentPayload, ...additionalPayloads]
      .filter((payload) => payload.league.season != null)
      .sort((a, b) => (getSeasonFromPayload(b) ?? 0) - (getSeasonFromPayload(a) ?? 0))

    const dedupedPayloads = new Map<number, EspnImportPayload>()
    for (const payload of payloads) {
      const season = getSeasonFromPayload(payload)
      if (season == null || dedupedPayloads.has(season)) continue
      dedupedPayloads.set(season, payload)
    }

    if (dedupedPayloads.size === 0) {
      return {
        attempted: true,
        skipped: true,
        reason: 'No ESPN seasons were available to backfill.',
        seasonsDiscovered: 0,
        seasonsImported: 0,
      }
    }

    let seasonsImported = 0
    let standingsPersisted = 0
    let rosterSnapshotsPersisted = 0
    let matchupFactsPersisted = 0

    for (const payload of dedupedPayloads.values()) {
      const season = getSeasonFromPayload(payload)
      if (season == null) continue

      await persistDynastySeason(
        args.leagueId,
        season,
        payload.league.leagueId,
        'espn',
        buildEspnSeasonMetadata(payload)
      )

      const finishedSeasonRows = payload.league.isFinished
        ? payload.teams.map((team) => ({
            rosterId: team.managerId || team.teamId,
            wins: team.wins,
            losses: team.losses,
            pointsFor: team.pointsFor,
            pointsAgainst: team.pointsAgainst ?? 0,
            champion: inferChampionFromEspnStandings(payload, team),
          }))
        : []

      if (finishedSeasonRows.length > 0) {
        await persistStandings(args.leagueId, season, finishedSeasonRows)
        standingsPersisted += finishedSeasonRows.length
      }

      for (const team of payload.teams) {
        await prisma.seasonStandingFact.upsert({
          where: {
            uniq_dw_standing_league_season_team: {
              leagueId: args.leagueId,
              season,
              teamId: team.teamId,
            },
          },
          create: {
            leagueId: args.leagueId,
            sport: payload.league.sport,
            season,
            teamId: team.teamId,
            wins: team.wins,
            losses: team.losses,
            ties: team.ties,
            pointsFor: team.pointsFor,
            pointsAgainst: team.pointsAgainst ?? 0,
            rank: team.rank ?? null,
          },
          update: {
            wins: team.wins,
            losses: team.losses,
            ties: team.ties,
            pointsFor: team.pointsFor,
            pointsAgainst: team.pointsAgainst ?? 0,
            rank: team.rank ?? null,
          },
        })
      }

      const warehouse = await persistEspnSeasonWarehouseFacts({
        leagueId: args.leagueId,
        payload,
      })

      rosterSnapshotsPersisted += warehouse.rosterSnapshotsPersisted
      matchupFactsPersisted += warehouse.matchupFactsPersisted
      seasonsImported += 1
    }

    const summary: EspnHistoricalBackfillSummary = {
      attempted: true,
      skipped: false,
      seasonsDiscovered: dedupedPayloads.size,
      seasonsImported,
      standingsPersisted,
      rosterSnapshotsPersisted,
      matchupFactsPersisted,
    }

    try {
      const graph = await buildLeagueGraph({
        leagueId: args.leagueId,
        season: null,
        includeTrades: false,
        includeRivalries: true,
      })
      summary.graph = {
        refreshed: true,
        nodeCount: graph.nodeCount,
        edgeCount: graph.edgeCount,
        snapshotId: graph.snapshotId,
      }
    } catch (error) {
      summary.graph = {
        refreshed: false,
        error: getErrorMessage(error),
      }
    }

    try {
      const hallOfFame = await rebuildHallOfFame({ leagueId: args.leagueId })
      summary.hallOfFame = {
        refreshed: true,
        count: hallOfFame.count,
      }
    } catch (error) {
      summary.hallOfFame = {
        refreshed: false,
        error: getErrorMessage(error),
      }
    }

    return summary
  } catch (error) {
    return {
      attempted: true,
      skipped: false,
      error: getErrorMessage(error),
      graph: {
        refreshed: false,
      },
      hallOfFame: {
        refreshed: false,
      },
    }
  }
}

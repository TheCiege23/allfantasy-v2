import type { LeagueSport } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { optimizeLineupDeterministic } from '@/lib/lineup-optimizer-engine/LineupOptimizerEngine'
import { getRosterTemplateForLeague } from '@/lib/multi-sport/MultiSportRosterService'

export type BestBallLineupResult = {
  starterIds: string[]
  totalProjectedPoints: number
  notes: string[]
}

export async function selectBestBallLineupForRoster(input: {
  leagueId: string
  leagueSport: LeagueSport
  season: number
  weekOrRound: number
  rosterPlayerIds: string[]
  formatType?: string | null
}): Promise<BestBallLineupResult> {
  if (input.rosterPlayerIds.length === 0) {
    return { starterIds: [], totalProjectedPoints: 0, notes: ['Roster is empty.'] }
  }

  const [template, stats, players] = await Promise.all([
    getRosterTemplateForLeague(input.leagueSport, input.formatType ?? undefined, input.leagueId),
    prisma.playerGameStat.findMany({
      where: {
        sportType: input.leagueSport,
        season: input.season,
        weekOrRound: input.weekOrRound,
        playerId: { in: input.rosterPlayerIds },
      },
      select: {
        playerId: true,
        fantasyPoints: true,
      },
    }),
    prisma.sportsPlayer.findMany({
      where: {
        sport: input.leagueSport,
        OR: [
          { externalId: { in: input.rosterPlayerIds } },
          { sleeperId: { in: input.rosterPlayerIds } },
        ],
      },
      select: {
        externalId: true,
        sleeperId: true,
        name: true,
        position: true,
        team: true,
      },
    }),
  ])

  const pointsByPlayerId = new Map<string, number>()
  for (const row of stats) {
    pointsByPlayerId.set(row.playerId, (pointsByPlayerId.get(row.playerId) ?? 0) + Number(row.fantasyPoints ?? 0))
  }

  const playerIndex = new Map<string, (typeof players)[number]>()
  for (const player of players) {
    playerIndex.set(player.externalId, player)
    if (player.sleeperId) playerIndex.set(player.sleeperId, player)
  }

  const optimizerResult = optimizeLineupDeterministic({
    sport: input.leagueSport,
    players: input.rosterPlayerIds.map((playerId) => {
      const player = playerIndex.get(playerId)
      return {
        id: playerId,
        name: player?.name ?? `Player ${playerId}`,
        positions: [player?.position ?? 'UTIL'],
        projectedPoints: pointsByPlayerId.get(playerId) ?? 0,
        team: player?.team ?? undefined,
      }
    }),
    slots: template.slots
      .flatMap((slot) =>
        Array.from({ length: slot.starterCount }, (_, index) => ({
          id: `${slot.slotName}-${index + 1}`,
          code: slot.slotName,
          label: slot.slotName,
          allowedPositions: slot.allowedPositions,
        }))
      ),
  })

  return {
    starterIds: optimizerResult.starters.map((starter) => starter.playerId),
    totalProjectedPoints: optimizerResult.totalProjectedPoints,
    notes: optimizerResult.deterministicNotes,
  }
}

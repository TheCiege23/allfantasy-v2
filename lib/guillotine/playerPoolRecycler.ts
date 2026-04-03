import { prisma } from '@/lib/prisma'

/**
 * Release all players from an eliminated roster into the guillotine waiver pool.
 */
export async function releaseRoster(
  eliminatedRosterId: string,
  seasonId: string,
  scoringPeriod: number,
  leagueId: string,
  delayHours: number,
): Promise<{ releasesCreated: number }> {
  const players = await prisma.redraftRosterPlayer.findMany({
    where: { rosterId: eliminatedRosterId, droppedAt: null },
  })

  const availableAt = new Date(Date.now() + Math.max(0, delayHours) * 60 * 60 * 1000)
  let n = 0
  for (const p of players) {
    await prisma.guillotineWaiverRelease.create({
      data: {
        seasonId,
        leagueId,
        eliminatedRosterId,
        scoringPeriod,
        playerId: p.playerId,
        playerName: p.playerName,
        position: p.position,
        team: p.team,
        sport: p.sport,
        releaseStatus: 'pending',
        availableAt,
      },
    })
    n++
  }
  return { releasesCreated: n }
}

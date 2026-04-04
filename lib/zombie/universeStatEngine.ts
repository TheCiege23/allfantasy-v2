import { prisma } from '@/lib/prisma'

/**
 * Aggregate stats across all leagues in a universe after weekly resolutions.
 */
export async function syncUniverseStats(universeId: string, week: number): Promise<void> {
  const leagues = await prisma.zombieLeague.findMany({
    where: { universeId },
    include: {
      teams: true,
      level: true,
    },
  })

  const season = new Date().getFullYear()

  for (const z of leagues) {
    for (const t of z.teams) {
      const roster = await prisma.roster.findUnique({
        where: { id: t.rosterId },
        select: { platformUserId: true },
      })
      const userKey = roster?.platformUserId ?? t.rosterId
      const played = (t.wins ?? 0) + (t.losses ?? 0)
      const ppw = played > 0 ? (t.pointsFor ?? 0) / played : 0
      const winPct = played > 0 ? (t.wins ?? 0) / played : 0

      await prisma.zombieUniverseStat.upsert({
        where: {
          universeId_userId_season: {
            universeId,
            userId: userKey,
            season,
          },
        },
        create: {
          universeId,
          userId: userKey,
          displayName: t.displayName ?? roster?.platformUserId ?? userKey,
          leagueId: z.leagueId,
          leagueName: z.name ?? z.leagueId,
          tierLabel: z.level?.tierLabel ?? z.level?.name ?? null,
          currentStatus: (t.status ?? 'Survivor').toLowerCase(),
          isWhisperer: t.isWhisperer,
          careerWins: t.wins ?? 0,
          careerLosses: t.losses ?? 0,
          careerPointsFor: t.pointsFor ?? 0,
          currentSeasonPPW: ppw,
          currentSeasonWinPct: winPct,
          season,
          lastUpdatedWeek: week,
        },
        update: {
          careerWins: t.wins ?? 0,
          careerLosses: t.losses ?? 0,
          careerPointsFor: t.pointsFor ?? 0,
          currentSeasonPPW: ppw,
          currentSeasonWinPct: winPct,
          currentStatus: (t.status ?? 'Survivor').toLowerCase(),
          isWhisperer: t.isWhisperer,
          lastUpdatedWeek: week,
        },
      })
    }
  }

  const all = await prisma.zombieUniverseStat.findMany({
    where: { universeId, season },
    orderBy: { currentSeasonPPW: 'desc' },
  })
  let rank = 1
  for (const row of all) {
    await prisma.zombieUniverseStat.update({
      where: { id: row.id },
      data: { universeRank: rank++ },
    })
  }
}

export async function executePromotionRelegation(universeId: string, season: number): Promise<void> {
  const u = await prisma.zombieUniverse.findUnique({ where: { id: universeId } })
  if (!u) throw new Error('Universe not found')

  const stats = await prisma.zombieUniverseStat.findMany({
    where: { universeId, season },
    orderBy: [{ currentSeasonWinPct: 'desc' }, { currentSeasonPPW: 'desc' }],
  })

  const promoteN = u.promotionCount ?? 2
  const relegateN = u.relegationCount ?? 2

  const top = stats.slice(0, promoteN)
  const bottom = stats.slice(-relegateN)

  if (u.promotionMode === 'auto') {
    for (const s of top) {
      await prisma.zombieMovementRecord.create({
        data: {
          universeId,
          userId: s.userId,
          displayName: s.displayName,
          season,
          fromTierLabel: s.tierLabel ?? 'unknown',
          toTierLabel: 'promoted',
          movementType: 'promoted',
          reason: 'record_performance',
        },
      })
    }
    for (const s of bottom) {
      await prisma.zombieMovementRecord.create({
        data: {
          universeId,
          userId: s.userId,
          displayName: s.displayName,
          season,
          fromTierLabel: s.tierLabel ?? 'unknown',
          toTierLabel: 'relegated',
          movementType: 'relegated',
          reason: 'record_performance',
        },
      })
    }
  }
}

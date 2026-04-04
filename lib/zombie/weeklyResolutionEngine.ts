import { prisma } from '@/lib/prisma'
import { resolveWeeklyInfections } from '@/lib/zombie/infectionEngine'

/**
 * Master weekly orchestrator: infections + resolution row + announcement stub.
 */
export async function runWeeklyResolution(zombieLeagueId: string, week: number) {
  const z = await prisma.zombieLeague.findUnique({
    where: { id: zombieLeagueId },
    include: { league: true },
  })
  if (!z) throw new Error('Zombie league not found')

  const season = await prisma.redraftSeason.findFirst({
    where: { leagueId: z.leagueId, season: z.season },
  })

  const infection = await resolveWeeklyInfections(zombieLeagueId, week)

  const matchupsJson: unknown[] = []
  if (season) {
    const mm = await prisma.redraftMatchup.findMany({
      where: { seasonId: season.id, week },
    })
    for (const m of mm) {
      matchupsJson.push({
        homeUserId: m.homeRosterId,
        awayUserId: m.awayRosterId,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        outcome: (m.homeScore ?? 0) >= (m.awayScore ?? 0) ? 'home' : 'away',
      })
    }
  }

  const res = await prisma.zombieWeeklyResolution.upsert({
    where: { zombieLeagueId_week: { zombieLeagueId, week } },
    create: {
      zombieLeagueId,
      week,
      status: 'complete',
      matchupResults: matchupsJson,
      newZombies: [],
      infectionCount: infection.infectionsCreated,
      resolvedAt: new Date(),
    },
    update: {
      status: 'complete',
      matchupResults: matchupsJson,
      infectionCount: infection.infectionsCreated,
      resolvedAt: new Date(),
    },
  })

  await prisma.zombieLeague.update({
    where: { id: zombieLeagueId },
    data: { currentWeek: week },
  })

  await prisma.zombieAnnouncement.create({
    data: {
      zombieLeagueId,
      universeId: z.universeId,
      type: 'weekly_recap',
      title: `Week ${week} resolved`,
      content: `Week ${week}: ${infection.infectionsCreated} new infection(s).`,
      week,
    },
  })

  return res
}

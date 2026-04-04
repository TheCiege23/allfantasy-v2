import { prisma } from '@/lib/prisma'
import { resolveWeeklyInfections } from '@/lib/zombie/infectionEngine'
import { finalizePendingSerumsForWeek } from '@/lib/zombie/serumEngine'
import { detectAndProcessBashings } from '@/lib/zombie/bashingEngine'
import { detectAndProcessMaulings } from '@/lib/zombie/maulingEngine'
import { checkAndAwardWeapons } from '@/lib/zombie/weaponEngine'

export type WeeklyResolutionOptions = {
  /** Re-run infections + recap even if this week already resolved (stat corrections / commissioner). */
  force?: boolean
}

/**
 * Master weekly orchestrator: infections, pending serums, bash/maul detection, weapon awards, recap row.
 */
export async function runWeeklyResolution(
  zombieLeagueId: string,
  week: number,
  opts?: WeeklyResolutionOptions,
) {
  const z = await prisma.zombieLeague.findUnique({
    where: { id: zombieLeagueId },
    include: { league: true },
  })
  if (!z) throw new Error('Zombie league not found')

  if (!opts?.force) {
    const existing = await prisma.zombieWeeklyResolution.findUnique({
      where: { zombieLeagueId_week: { zombieLeagueId, week } },
    })
    if (existing?.status === 'complete' && existing.resolvedAt) {
      return existing
    }
  }

  const season = await prisma.redraftSeason.findFirst({
    where: { leagueId: z.leagueId, season: z.season },
  })

  const infection = await resolveWeeklyInfections(zombieLeagueId, week)
  await finalizePendingSerumsForWeek(z.leagueId, week, z.season)
  await detectAndProcessBashings(z.leagueId, week, zombieLeagueId)
  await detectAndProcessMaulings(z.leagueId, week, zombieLeagueId)
  await checkAndAwardWeapons(z.leagueId, week, zombieLeagueId)

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

import { prisma } from '@/lib/prisma'
import { runInfectionForWeek } from '@/lib/zombie/ZombieInfectionEngine'
import { setRevived } from '@/lib/zombie/ZombieOwnerStatusService'

export type InfectionResolutionResult = {
  zombieLeagueId: string
  week: number
  infectionsCreated: number
}

/**
 * Resolve infections for a week after matchup facts / scores are final.
 * Delegates to legacy `ZombieInfectionEngine` (MatchupFact + roster map).
 */
export async function resolveWeeklyInfections(
  zombieLeagueId: string,
  week: number,
): Promise<InfectionResolutionResult> {
  const z = await prisma.zombieLeague.findUnique({ where: { id: zombieLeagueId } })
  if (!z) throw new Error('Zombie league not found')

  const outcome = await runInfectionForWeek({
    leagueId: z.leagueId,
    week,
    season: z.season,
    zombieLeagueId,
  })

  for (const inf of outcome.infected) {
    const victimUser = await prisma.roster.findFirst({
      where: { leagueId: z.leagueId, id: inf.survivorRosterId },
      select: { platformUserId: true },
    })
    const infectorUser = await prisma.roster.findFirst({
      where: { leagueId: z.leagueId, id: inf.infectedByRosterId },
      select: { platformUserId: true },
    })
    if (!victimUser?.platformUserId || !infectorUser?.platformUserId) continue

    await prisma.zombieInfectionEvent.create({
      data: {
        zombieLeagueId,
        week,
        infectorUserId: infectorUser.platformUserId,
        infectorStatus: 'zombie',
        infectorName: infectorUser.platformUserId,
        victimUserId: victimUser.platformUserId,
        victimName: victimUser.platformUserId,
        victimPriorStatus: 'survivor',
        victimNewStatus: 'zombie',
        infectorScore: 0,
        victimScore: 0,
        scoreDifference: 0,
      },
    })
  }

  return {
    zombieLeagueId,
    week,
    infectionsCreated: outcome.infected.length,
  }
}

export async function applyRevive(
  zombieLeagueId: string,
  targetUserId: string,
  _appliedByUserId: string,
  week: number,
): Promise<void> {
  const z = await prisma.zombieLeague.findUnique({ where: { id: zombieLeagueId } })
  if (!z) throw new Error('Zombie league not found')
  const roster = await prisma.roster.findFirst({
    where: { leagueId: z.leagueId, platformUserId: targetUserId },
  })
  if (!roster) throw new Error('Roster not found')

  await setRevived(z.leagueId, roster.id)
  await prisma.zombieAnnouncement.create({
    data: {
      zombieLeagueId,
      universeId: z.universeId,
      type: 'survivor_achievement',
      title: 'Revived',
      content: `A player was revived in week ${week}.`,
      week,
    },
  })
}

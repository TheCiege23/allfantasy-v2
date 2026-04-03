import { prisma } from '@/lib/prisma'
import { computeKeeperEligibility } from './eligibilityEngine'
import { openKeeperSelectionPhase } from './selectionEngine'

export async function triggerKeeperOffseason(
  leagueId: string,
  completedSeasonId: string,
): Promise<void> {
  await prisma.redraftSeason.updateMany({
    where: { id: completedSeasonId, leagueId },
    data: { status: 'complete' },
  })

  await prisma.league.update({
    where: { id: leagueId },
    data: { dynastySeasonPhase: 'offseason' },
  })

  await computeKeeperEligibility(leagueId, completedSeasonId)

  const incoming = await prisma.redraftSeason.findFirst({
    where: { leagueId, NOT: { id: completedSeasonId } },
    orderBy: { createdAt: 'desc' },
  })
  if (!incoming) return

  const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await openKeeperSelectionPhase(leagueId, incoming.id, deadline)
}

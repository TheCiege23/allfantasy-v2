import { prisma } from '@/lib/prisma'

/**
 * Cancels pending redraft trades touching an eliminated roster (Survivor / guillotine / manual boot).
 */
export async function voidPendingRedraftTradesForRoster(leagueId: string, rosterId: string): Promise<number> {
  const season = await prisma.redraftSeason.findFirst({
    where: { leagueId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  if (!season) return 0

  const res = await prisma.redraftLeagueTrade.updateMany({
    where: {
      seasonId: season.id,
      status: 'pending',
      OR: [{ proposerRosterId: rosterId }, { receiverRosterId: rosterId }],
    },
    data: {
      status: 'void_elimination',
      notes: 'Voided automatically: roster eliminated from league.',
      processedAt: new Date(),
    },
  })
  return res.count
}

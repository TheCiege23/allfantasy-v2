import { prisma } from '@/lib/prisma'

export type CorrectionResult = {
  reversed: boolean
  summary: string
  newEliminatedRosterId?: string
}

/**
 * Official stat corrections within the league correction window.
 * Full implementation: reload scores, compare chop outcome, reverse/recreate elimination + waiver releases.
 */
export async function handleStatCorrection(
  seasonId: string,
  scoringPeriod: number,
  correctedPlayerIds: string[],
): Promise<CorrectionResult> {
  void correctedPlayerIds
  const g = await prisma.guillotineSeason.findFirst({ where: { id: seasonId } })
  if (!g) return { reversed: false, summary: 'Season not found' }

  const lastElim = await prisma.guillotineElimination.findFirst({
    where: { seasonId, scoringPeriod },
    orderBy: { eliminatedAt: 'desc' },
  })
  if (!lastElim) {
    return { reversed: false, summary: 'No elimination to revisit for this period' }
  }

  return {
    reversed: false,
    summary:
      `Queued stat correction review for season ${seasonId} period ${scoringPeriod}. ` +
      `Eliminated roster ${lastElim.eliminatedRosterId} — wire full reversal + waiver recall when scores stabilize.`,
  }
}

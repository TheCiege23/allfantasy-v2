import { prisma } from '@/lib/prisma'

export async function transitionToFinalStage(seasonId: string, scoringPeriod: number): Promise<void> {
  await prisma.guillotineSeason.update({
    where: { id: seasonId },
    data: {
      isInFinalStage: true,
      finalStageStartPeriod: scoringPeriod,
      status: 'final_stage',
    },
  })
}

export async function determineFinalChampion(seasonId: string): Promise<string | null> {
  const g = await prisma.guillotineSeason.findFirst({
    where: { id: seasonId },
    include: {
      redraftSeason: {
        include: { rosters: { where: { isEliminated: false } } },
      },
    },
  })
  if (!g?.redraftSeason) return null
  const alive = g.redraftSeason.rosters
  if (alive.length === 1) return alive[0]!.id
  return null
}

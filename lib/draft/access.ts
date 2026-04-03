import { prisma } from '@/lib/prisma'

export async function canAccessLeague(leagueId: string, userId: string): Promise<boolean> {
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: {
      id: true,
      userId: true,
      teams: { select: { claimedByUserId: true } },
    },
  })
  if (!league) return false
  if (league.userId === userId) return true
  return league.teams.some((t) => t.claimedByUserId === userId)
}

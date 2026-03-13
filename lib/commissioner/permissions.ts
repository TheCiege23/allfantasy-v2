import { prisma } from '@/lib/prisma'

/**
 * Commissioner = league owner (League.userId).
 * Do not use for admin-only controls; commissioners are scoped to their league.
 */

export async function isCommissioner(leagueId: string, userId: string | undefined): Promise<boolean> {
  if (!userId) return false
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: { userId: true },
  })
  return league?.userId === userId
}

export async function getLeagueIfCommissioner(leagueId: string, userId: string | undefined) {
  if (!userId) return null
  const league = await prisma.league.findFirst({
    where: { id: leagueId, userId },
  })
  return league
}

/**
 * Throws if not commissioner. Use in API routes after getServerSession.
 */
export async function assertCommissioner(leagueId: string, userId: string | undefined): Promise<{ league: NonNullable<Awaited<ReturnType<typeof getLeagueIfCommissioner>>> }> {
  const league = await getLeagueIfCommissioner(leagueId, userId)
  if (!league) {
    const err = new Error('Forbidden') as Error & { status?: number }
    err.status = 403
    throw err
  }
  return { league }
}

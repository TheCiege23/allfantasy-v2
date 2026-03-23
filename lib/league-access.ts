import { prisma } from '@/lib/prisma'

export interface LeagueAccessResult {
  leagueId: string
  leagueSport: string
  isCommissioner: boolean
  isMember: boolean
}

export async function resolveLeagueAccess(
  leagueId: string,
  userId: string | undefined | null
): Promise<LeagueAccessResult | null> {
  if (!userId) return null
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, sport: true, userId: true },
  })
  if (!league) return null

  if (league.userId === userId) {
    return {
      leagueId: league.id,
      leagueSport: league.sport,
      isCommissioner: true,
      isMember: true,
    }
  }

  const memberCount = await prisma.roster.count({
    where: { leagueId, platformUserId: userId },
  })
  if (memberCount <= 0) return null

  return {
    leagueId: league.id,
    leagueSport: league.sport,
    isCommissioner: false,
    isMember: true,
  }
}

export async function assertLeagueMember(
  leagueId: string,
  userId: string | undefined | null
): Promise<LeagueAccessResult> {
  const access = await resolveLeagueAccess(leagueId, userId)
  if (!access?.isMember) {
    const err = new Error('Forbidden') as Error & { status?: number }
    err.status = 403
    throw err
  }
  return access
}

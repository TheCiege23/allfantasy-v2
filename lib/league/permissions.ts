import { prisma } from '@/lib/prisma'

export type LeagueRole = 'commissioner' | 'co_commissioner' | 'member' | null

/**
 * Returns the role of userId in leagueId.
 * Returns null if the user is not a member of that league.
 */
export async function getLeagueRole(leagueId: string, userId: string): Promise<LeagueRole> {
  const team = await prisma.leagueTeam.findFirst({
    where: {
      leagueId,
      claimedByUserId: userId,
    },
    select: {
      isCommissioner: true,
      isCoCommissioner: true,
    },
  })

  if (!team) {
    const league = await prisma.league.findFirst({
      where: { id: leagueId, userId },
      select: { isCommissioner: true },
    })
    if (league?.isCommissioner) return 'commissioner'
    return null
  }

  if (team.isCommissioner) return 'commissioner'
  if (team.isCoCommissioner) return 'co_commissioner'
  return 'member'
}

/**
 * Throws a 403 Response if userId is not commissioner or co-commissioner
 * of leagueId. Use this at the top of every settings API route.
 */
export async function requireCommissionerRole(leagueId: string, userId: string): Promise<void> {
  const role = await getLeagueRole(leagueId, userId)
  if (role !== 'commissioner' && role !== 'co_commissioner') {
    throw new Response(
      JSON.stringify({ error: 'Only the commissioner can change league settings.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

/**
 * Same as requireCommissionerRole but ONLY allows commissioner (not co-comm).
 * Use for destructive actions like Reset Draft and co-commissioner management.
 */
export async function requireCommissionerOnly(leagueId: string, userId: string): Promise<void> {
  const role = await getLeagueRole(leagueId, userId)
  if (role !== 'commissioner') {
    throw new Response(
      JSON.stringify({ error: 'Only the head commissioner can perform this action.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

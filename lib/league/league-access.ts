import { prisma } from '@/lib/prisma'

import { getLeagueRole } from '@/lib/league/permissions'

export async function assertLeagueMember(leagueId: string, userId: string) {
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    include: { teams: { where: { claimedByUserId: userId } } },
  })
  if (!league) return { ok: false as const, status: 404 as const }
  if (league.userId === userId) return { ok: true as const, league }
  if (league.teams.length > 0) return { ok: true as const, league }
  return { ok: false as const, status: 403 as const }
}

/** Head commissioner or co-commissioner (settings access). */
export async function assertLeagueCommissioner(leagueId: string, userId: string) {
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    include: { teams: true },
  })
  if (!league) return { ok: false as const, status: 404 as const }
  const role = await getLeagueRole(leagueId, userId)
  if (role === 'commissioner' || role === 'co_commissioner') {
    return { ok: true as const, league }
  }
  return { ok: false as const, status: 403 as const }
}

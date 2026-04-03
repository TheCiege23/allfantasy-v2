import { prisma } from '@/lib/prisma'

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

export async function assertLeagueCommissioner(leagueId: string, userId: string) {
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    include: { teams: { where: { claimedByUserId: userId } } },
  })
  if (!league) return { ok: false as const, status: 404 as const }
  if (league.userId === userId) return { ok: true as const, league }
  const team = league.teams[0]
  if (team?.role === 'commissioner') return { ok: true as const, league }
  return { ok: false as const, status: 403 as const }
}

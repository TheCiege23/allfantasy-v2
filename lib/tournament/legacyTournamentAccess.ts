import 'server-only'

import { prisma } from '@/lib/prisma'

function hubVisibility(t: { hubSettings: unknown; settings: unknown }): 'public' | 'unlisted' | 'private' {
  const h = (t.hubSettings as Record<string, unknown> | null) ?? {}
  const hv = h.visibility
  if (hv === 'public' || hv === 'unlisted' || hv === 'private') return hv
  const s = (t.settings as Record<string, unknown> | null) ?? {}
  const uv = s.universalPageVisibility
  if (uv === 'public' || uv === 'unlisted' || uv === 'private') return uv
  return 'unlisted'
}

async function isLegacyTournamentInsider(tournamentId: string, creatorId: string, userId: string): Promise<boolean> {
  if (creatorId === userId) return true
  const p = await prisma.legacyTournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  })
  if (p) return true
  const links = await prisma.legacyTournamentLeague.findMany({
    where: { tournamentId },
    select: { leagueId: true },
  })
  const leagueIds = links.map((l) => l.leagueId)
  if (leagueIds.length === 0) return false
  const team = await prisma.leagueTeam.findFirst({
    where: { leagueId: { in: leagueIds }, claimedByUserId: userId },
    select: { id: true },
  })
  return Boolean(team)
}

/** Whether the user may call tournament standings for a legacy (wizard-created) tournament. */
export async function canViewLegacyTournamentStandings(
  tournament: { id: string; creatorId: string; hubSettings: unknown; settings: unknown },
  userId: string | null,
): Promise<boolean> {
  const vis = hubVisibility(tournament)
  if (vis === 'public') return true
  if (!userId) return false
  return isLegacyTournamentInsider(tournament.id, tournament.creatorId, userId)
}

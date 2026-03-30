/**
 * Draft access: league owner or commissioner can access; members can view/submit when on clock.
 */

import { prisma } from '@/lib/prisma'
import { isCommissioner } from '@/lib/commissioner/permissions'

/**
 * User can view draft session if they are commissioner (league owner) or have their own roster in the league.
 */
export async function canAccessLeagueDraft(leagueId: string, userId: string | undefined): Promise<boolean> {
  if (!userId) return false
  if (await isCommissioner(leagueId, userId)) return true
  const roster = await prisma.roster.findFirst({
    where: { leagueId, platformUserId: userId },
    select: { id: true },
  })
  return roster != null
}

/**
 * User can submit a pick if they are commissioner or the rosterId is theirs (on clock).
 */
export async function canSubmitPickForRoster(
  leagueId: string,
  userId: string | undefined,
  rosterId: string
): Promise<boolean> {
  if (!userId) return false
  if (await isCommissioner(leagueId, userId)) return true
  const roster = await prisma.roster.findFirst({
    where: { id: rosterId, leagueId },
    select: { id: true, platformUserId: true },
  })
  if (!roster) return false
  return roster.platformUserId === userId
}

/**
 * Current user's roster id for this league (for draft room: "am I on the clock?" and auto-pick).
 * Uses platformUserId = userId; returns null if user has no roster in the league.
 */
export async function getCurrentUserRosterIdForLeague(
  leagueId: string,
  userId: string | undefined
): Promise<string | null> {
  if (!userId) return null
  const roster = await prisma.roster.findFirst({
    where: { leagueId, platformUserId: userId },
    select: { id: true },
  })
  return roster?.id ?? null
}

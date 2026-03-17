/**
 * Identify orphan or empty team rosters (platformUserId = orphan-{rosterId}).
 * Used to decide when AI manager can act and for commissioner status.
 */

import { prisma } from '@/lib/prisma'

const ORPHAN_PREFIX = 'orphan-'

export function isOrphanPlatformUserId(platformUserId: string): boolean {
  return typeof platformUserId === 'string' && platformUserId.startsWith(ORPHAN_PREFIX)
}

/**
 * Roster IDs in this league whose platformUserId is orphan (no human manager).
 */
export async function getOrphanRosterIdsForLeague(leagueId: string): Promise<string[]> {
  const rosters = await prisma.roster.findMany({
    where: { leagueId },
    select: { id: true, platformUserId: true },
  })
  return rosters.filter((r) => isOrphanPlatformUserId(r.platformUserId)).map((r) => r.id)
}

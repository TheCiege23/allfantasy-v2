/**
 * [NEW] lib/big-brother/bigBrotherGuard.ts
 * Guard: prevent evicted rosters from competitive actions. PROMPT 2/6.
 */

import { prisma } from '@/lib/prisma'

export async function isEliminated(leagueId: string, rosterId: string): Promise<boolean> {
  const cycle = await prisma.bigBrotherCycle.findFirst({
    where: { leagueId, evictedRosterId: rosterId },
    select: { id: true },
  })
  return cycle != null
}

/** All roster IDs that have been evicted in this league (for exclusion from HOH/veto/vote). */
export async function getExcludedRosterIds(leagueId: string): Promise<string[]> {
  const cycles = await prisma.bigBrotherCycle.findMany({
    where: { leagueId, evictedRosterId: { not: null } },
    select: { evictedRosterId: true },
  })
  return cycles
    .map((c) => c.evictedRosterId)
    .filter((id): id is string => id != null)
}

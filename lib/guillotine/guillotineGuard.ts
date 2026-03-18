/**
 * Guard: prevent chopped rosters from making lineup/roster actions.
 */

import { prisma } from '@/lib/prisma'

export async function isRosterChopped(leagueId: string, rosterId: string): Promise<boolean> {
  const row = await prisma.guillotineRosterState.findUnique({
    where: { rosterId },
    select: { leagueId: true, choppedAt: true },
  })
  return row != null && row.leagueId === leagueId && row.choppedAt != null
}

export async function getChoppedRosterIds(leagueId: string): Promise<string[]> {
  const rows = await prisma.guillotineRosterState.findMany({
    where: { leagueId, choppedAt: { not: null } },
    select: { rosterId: true },
  })
  return rows.map((r) => r.rosterId)
}

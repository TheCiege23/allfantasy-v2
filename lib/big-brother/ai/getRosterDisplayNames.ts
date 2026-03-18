/**
 * [NEW] Resolve roster IDs to display names for Big Brother UI and AI.
 */

import { prisma } from '@/lib/prisma'

export async function getRosterDisplayNamesForLeague(
  leagueId: string,
  rosterIds?: string[]
): Promise<Record<string, string>> {
  const where: { leagueId: string; id?: { in: string[] } } = { leagueId }
  if (rosterIds?.length) where.id = { in: rosterIds }

  const rosters = await prisma.roster.findMany({
    where,
    select: { id: true, platformUserId: true },
  })
  if (rosters.length === 0) return {}

  const userIds = [...new Set(rosters.map((r) => r.platformUserId).filter(Boolean))]
  const users = await prisma.appUser.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true, email: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u.displayName || u.email || u.id]))

  const out: Record<string, string> = {}
  for (const r of rosters) {
    out[r.id] = userMap.get(r.platformUserId) ?? `Houseguest ${r.id.slice(0, 8)}`
  }
  return out
}

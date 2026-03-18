/**
 * Data consistency (PROMPT 320): waiver claim integrity.
 * Detect WaiverClaim rows where roster does not belong to the claim's league (roster.leagueId !== claim.leagueId).
 * Such claims should not exist after createClaim validation; this helps find legacy or bad data.
 */

import { prisma } from '@/lib/prisma'

export interface WaiverClaimMismatch {
  claimId: string
  leagueId: string
  rosterId: string
  rosterLeagueId: string | null
  status: string
}

/**
 * Find waiver claims whose roster is missing or belongs to a different league.
 */
export async function findWaiverClaimRosterMismatches(limit = 500): Promise<WaiverClaimMismatch[]> {
  const claims = await (prisma as any).waiverClaim.findMany({
    take: limit,
    select: { id: true, leagueId: true, rosterId: true, status: true },
  })
  if (claims.length === 0) return []

  const rosterIds = [...new Set(claims.map((c: { rosterId: string }) => c.rosterId))]
  const rosters = await (prisma as any).roster.findMany({
    where: { id: { in: rosterIds } },
    select: { id: true, leagueId: true },
  })
  const rosterByLeague = new Map(rosters.map((r: { id: string; leagueId: string }) => [r.id, r.leagueId]))

  const mismatches: WaiverClaimMismatch[] = []
  for (const c of claims) {
    const rosterLeagueId = rosterByLeague.get(c.rosterId) ?? null
    if (rosterLeagueId !== c.leagueId) {
      mismatches.push({
        claimId: c.id,
        leagueId: c.leagueId,
        rosterId: c.rosterId,
        rosterLeagueId,
        status: c.status,
      })
    }
  }
  return mismatches
}

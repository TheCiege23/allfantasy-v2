import { prisma } from '@/lib/prisma'
import { assignIdpCapSalaryForWaiverClaim } from '@/lib/idp/capEngine'

export type ProcessedClaim = { claimId: string; status: string; reason?: string }

/**
 * After a claim is approved and `RedraftRosterPlayer` exists for the add, assign IDP cap salary.
 * No-op when the league has no `IDPCapConfig`.
 */
export async function finalizeRedraftWaiverClaimIdpCap(opts: {
  leagueId: string
  rosterId: string
  addPlayerId: string
  addPlayerName: string
  bidAmount: number | null | undefined
  position: string
  isDefensive: boolean
}): Promise<void> {
  await assignIdpCapSalaryForWaiverClaim(
    opts.leagueId,
    opts.rosterId,
    opts.addPlayerId,
    opts.addPlayerName,
    opts.position,
    opts.isDefensive,
    opts.bidAmount,
  )
}

export async function processWaiverWindow(
  leagueId: string,
  seasonId: string,
): Promise<ProcessedClaim[]> {
  const claims = await prisma.redraftWaiverClaim.findMany({
    where: { leagueId, seasonId, status: 'pending' },
    orderBy: [{ bidAmount: 'desc' }, { submittedAt: 'asc' }],
  })
  const results: ProcessedClaim[] = []
  for (const c of claims) {
    results.push({
      claimId: c.id,
      status: 'denied',
      reason: 'Waiver engine not fully wired — placeholder',
    })
    // When implementing approvals: after roster add, if idpCap, call:
    // await finalizeRedraftWaiverClaimIdpCap({ leagueId, rosterId: c.rosterId, addPlayerId: c.addPlayerId, ... })
  }
  return results
}

export async function resetWaiverPriority(seasonId: string): Promise<void> {
  const rosters = await prisma.redraftRoster.findMany({
    where: { seasonId },
    orderBy: [{ wins: 'asc' }, { pointsFor: 'asc' }],
  })
  let p = 1
  for (const r of rosters) {
    await prisma.redraftRoster.update({
      where: { id: r.id },
      data: { waiverPriority: p },
    })
    p += 1
  }
}

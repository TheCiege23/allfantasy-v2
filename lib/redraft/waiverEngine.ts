import { prisma } from '@/lib/prisma'

export type ProcessedClaim = { claimId: string; status: string; reason?: string }

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

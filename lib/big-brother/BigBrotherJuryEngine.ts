/**
 * [NEW] lib/big-brother/BigBrotherJuryEngine.ts
 * Jury: when eliminated users become jury; finale vote. PROMPT 2/6.
 */

import { prisma } from '@/lib/prisma'
import { getBigBrotherConfig } from './BigBrotherLeagueConfig'
import { appendBigBrotherAudit } from './BigBrotherAuditLog'

/**
 * Check if the next evictee should join jury (by config: after_eliminations, when_remaining, or fixed_week).
 */
export async function shouldJoinJury(leagueId: string, week: number, remainingCount: number): Promise<boolean> {
  const config = await getBigBrotherConfig(leagueId)
  if (!config) return false

  switch (config.juryStartMode) {
    case 'after_eliminations': {
      const eliminated = await prisma.bigBrotherCycle.count({
        where: { leagueId, evictedRosterId: { not: null } },
      })
      return eliminated >= (config.juryStartAfterEliminations ?? 0)
    }
    case 'when_remaining':
      return remainingCount <= (config.juryStartWhenRemaining ?? 0)
    case 'fixed_week':
      return week >= (config.juryStartWeek ?? 0)
    default:
      return false
  }
}

/**
 * Enroll an evicted roster as jury member (call after eviction when shouldJoinJury).
 */
export async function enrollJuryMember(leagueId: string, configId: string, rosterId: string, evictedWeek: number): Promise<void> {
  await prisma.bigBrotherJuryMember.upsert({
    where: { leagueId_rosterId: { leagueId, rosterId } },
    create: { leagueId, configId, rosterId, evictedWeek },
    update: {},
  })
  await appendBigBrotherAudit(leagueId, configId, 'jury_enrolled', { rosterId, evictedWeek })
}

/**
 * Get jury members for a league.
 */
export async function getJuryMembers(leagueId: string) {
  return prisma.bigBrotherJuryMember.findMany({
    where: { leagueId },
    orderBy: { joinedAt: 'asc' },
  })
}

/**
 * Submit finale vote (jury member votes for a finalist). One vote per jury member.
 */
export async function submitFinaleVote(
  leagueId: string,
  juryRosterId: string,
  targetRosterId: string
): Promise<{ ok: boolean; error?: string }> {
  const member = await prisma.bigBrotherJuryMember.findUnique({
    where: { leagueId_rosterId: { leagueId, rosterId: juryRosterId } },
  })
  if (!member) return { ok: false, error: 'Not a jury member' }

  await prisma.bigBrotherFinaleVote.upsert({
    where: { leagueId_juryRosterId: { leagueId, juryRosterId } },
    create: { leagueId, juryRosterId, targetRosterId },
    update: { targetRosterId },
  })
  return { ok: true }
}

/**
 * Tally finale votes and return winner (most votes). Tie = first by joinedAt order (or config later).
 */
export async function tallyFinaleVotes(leagueId: string): Promise<{ targetRosterId: string; voteCount: number } | null> {
  const votes = await prisma.bigBrotherFinaleVote.findMany({
    where: { leagueId },
    select: { targetRosterId: true },
  })
  const count: Record<string, number> = {}
  for (const v of votes) {
    count[v.targetRosterId] = (count[v.targetRosterId] ?? 0) + 1
  }
  const entries = Object.entries(count)
  if (entries.length === 0) return null
  const [targetRosterId, voteCount] = entries.reduce((a, b) => (a[1] >= b[1] ? a : b))
  return { targetRosterId, voteCount }
}

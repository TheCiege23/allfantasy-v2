/**
 * [NEW] lib/big-brother/BigBrotherFinaleService.ts
 * Finale: final 2 or 3, jury private ballot, tally, announce winner. Deterministic. PROMPT 3.
 */

import { prisma } from '@/lib/prisma'
import { getBigBrotherConfig } from './BigBrotherLeagueConfig'
import { tallyFinaleVotes } from './BigBrotherJuryEngine'
import { announceFinaleWinner } from './BigBrotherChatAnnouncements'
import { appendBigBrotherAudit } from './BigBrotherAuditLog'

/**
 * Check if league has reached finale (remaining players <= finale size).
 */
export async function isFinaleReached(leagueId: string): Promise<boolean> {
  const config = await getBigBrotherConfig(leagueId)
  if (!config) return false

  const evictedCount = await prisma.bigBrotherCycle.count({
    where: { leagueId, evictedRosterId: { not: null } },
  })
  const totalRosters = await prisma.roster.count({ where: { leagueId } })
  const remaining = totalRosters - evictedCount
  const finaleSize = config.finaleFormat === 'final_3' ? 3 : 2
  return remaining <= finaleSize
}

/**
 * Tally finale votes and announce winner. Call when finale voting is closed.
 */
export async function runFinaleTallyAndAnnounce(
  leagueId: string,
  options?: { systemUserId?: string | null; winnerDisplayName?: string }
): Promise<{ ok: boolean; winnerRosterId?: string; voteCount?: number; error?: string }> {
  const config = await getBigBrotherConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a Big Brother league' }

  const result = await tallyFinaleVotes(leagueId)
  if (!result) return { ok: false, error: 'No finale votes' }

  await appendBigBrotherAudit(leagueId, config.configId, 'finale_vote', {
    winnerRosterId: result.targetRosterId,
    voteCount: result.voteCount,
  })

  await announceFinaleWinner({
    leagueId,
    winnerRosterId: result.targetRosterId,
    winnerName: options?.winnerDisplayName,
    voteCount: result.voteCount,
    systemUserId: options?.systemUserId,
  })

  return {
    ok: true,
    winnerRosterId: result.targetRosterId,
    voteCount: result.voteCount,
  }
}

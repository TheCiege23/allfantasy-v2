/**
 * [NEW] lib/big-brother/BigBrotherEvictionService.ts
 * Close vote, tally, evict, release roster, enroll jury, audit, announce. PROMPT 2/6 + 3.
 */

import { prisma } from '@/lib/prisma'
import { getBigBrotherConfig } from './BigBrotherLeagueConfig'
import { tallyEvictionVotes } from './BigBrotherVoteEngine'
import { shouldJoinJury, enrollJuryMember } from './BigBrotherJuryEngine'
import { releaseEvictedRoster } from './BigBrotherRosterReleaseEngine'
import { appendBigBrotherAudit } from './BigBrotherAuditLog'
import { announceEviction } from './BigBrotherChatAnnouncements'
import { transitionPhase } from './BigBrotherPhaseStateMachine'
import { getRosterPlayerIds } from '@/lib/waiver-wire/roster-utils'
import type { BigBrotherEvictionResult } from './types'

export interface CloseEvictionOptions {
  systemUserId?: string | null
  evictedDisplayName?: string
  postToChat?: boolean
}

/**
 * Close eviction: set closedAt, tally votes, set evictedRosterId, release roster, optionally enroll jury, audit, announce.
 * Call when vote window has closed. Tie-break: season points (lowest evicted) unless config adds HOH vote later.
 */
export async function closeEviction(
  cycleId: string,
  options?: CloseEvictionOptions
): Promise<{ ok: boolean; result?: BigBrotherEvictionResult; error?: string }> {
  const cycle = await prisma.bigBrotherCycle.findUnique({
    where: { id: cycleId },
    select: {
      id: true,
      leagueId: true,
      configId: true,
      week: true,
      closedAt: true,
      evictedRosterId: true,
    },
  })
  if (!cycle) return { ok: false, error: 'Cycle not found' }
  if (cycle.closedAt) return { ok: false, error: 'Eviction already closed' }
  if (cycle.evictedRosterId) return { ok: false, error: 'Evicted already set' }

  const tally = await tallyEvictionVotes(cycleId)
  const evictedRosterId = tally.evictedRosterId
  if (!evictedRosterId) return { ok: false, error: 'Tally produced no evictee' }

  const config = await getBigBrotherConfig(cycle.leagueId)
  if (!config) return { ok: false, error: 'Not a Big Brother league' }

  const totalRosters = await prisma.roster.count({
    where: { leagueId: cycle.leagueId },
  })
  const evictedCountBefore = await prisma.bigBrotherCycle.count({
    where: { leagueId: cycle.leagueId, evictedRosterId: { not: null } },
  })
  const remainingAfter = totalRosters - evictedCountBefore - 1

  await prisma.bigBrotherCycle.update({
    where: { id: cycleId },
    data: {
      closedAt: new Date(),
      evictedRosterId,
      tieBreakSeasonPoints: tally.tieBreakSeasonPoints,
    },
  })

  await releaseEvictedRoster(cycle.leagueId, evictedRosterId)

  const [league, evictedRoster] = await Promise.all([
    prisma.league.findUnique({ where: { id: cycle.leagueId }, select: { sport: true } }),
    prisma.roster.findUnique({ where: { id: evictedRosterId }, select: { playerData: true } }),
  ])
  const sport = (league?.sport ?? 'NFL') as string
  const releasedPlayerIds = evictedRoster ? getRosterPlayerIds(evictedRoster.playerData) : []
  try {
    await (prisma as any).transactionFact.create({
      data: {
        leagueId: cycle.leagueId,
        sport,
        type: 'big_brother_eviction',
        rosterId: evictedRosterId,
        payload: { cycleId, week: cycle.week, voteCount: tally.votesByTarget, tied: tally.tied, releasedPlayerCount: releasedPlayerIds.length },
        weekOrPeriod: cycle.week,
        season: new Date().getFullYear(),
      },
    })
  } catch {
    // non-fatal: transaction log optional
  }

  let juryEnrolled = false
  if (await shouldJoinJury(cycle.leagueId, cycle.week, remainingAfter)) {
    await enrollJuryMember(cycle.leagueId, cycle.configId, evictedRosterId, cycle.week)
    juryEnrolled = true
  }

  await appendBigBrotherAudit(cycle.leagueId, cycle.configId, 'eviction', {
    cycleId,
    week: cycle.week,
    evictedRosterId,
    voteCount: tally.votesByTarget,
    tied: tally.tied,
    juryEnrolled,
    releasedPlayerCount: releasedPlayerIds.length,
  })

  if (options?.postToChat !== false) {
    await announceEviction({
      leagueId: cycle.leagueId,
      week: cycle.week,
      evictedRosterId,
      evictedName: options?.evictedDisplayName,
      voteCount: tally.votesByTarget,
      showExactTotals: config.publicVoteTotalsVisibility === 'exact',
      tieBreakUsed: tally.tied,
      juryEnrolled,
      systemUserId: options?.systemUserId,
    })
  }

  await transitionPhase(cycleId, 'EVICTION_RESOLVED', { evictedRosterId })

  const result: BigBrotherEvictionResult = {
    cycleId,
    week: cycle.week,
    evictedRosterId,
    voteCount: tally.votesByTarget,
    tieBreakUsed: tally.tied,
    juryEnrolled,
  }
  return { ok: true, result }
}

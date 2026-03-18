/**
 * [NEW] lib/big-brother/BigBrotherVoteEngine.ts
 * Private eviction vote submit and tally. HOH votes only in tie when configured. PROMPT 2/6.
 */

import { prisma } from '@/lib/prisma'
import { getBigBrotherConfig } from './BigBrotherLeagueConfig'
import { getFinalNomineeRosterIds } from './BigBrotherNominationEngine'
import { getSeasonPointsFromRosterPerformance } from '@/lib/survivor/SurvivorVoteEngine'
import type { BigBrotherVoteTally } from './types'

export interface SeasonPointsSource {
  getSeasonPointsForRoster(leagueId: string, rosterId: string, throughWeek: number): Promise<number>
}

const defaultSeasonPoints: SeasonPointsSource = {
  getSeasonPointsForRoster: getSeasonPointsFromRosterPerformance,
}

/**
 * Get roster IDs eligible to vote this cycle: not evicted, not HOH (if hohVotesOnlyInTie), not on the block.
 */
export async function getEligibleVoterRosterIds(
  leagueId: string,
  cycleId: string,
  hohVotesOnlyInTie: boolean
): Promise<string[]> {
  const cycle = await prisma.bigBrotherCycle.findUnique({
    where: { id: cycleId },
    select: { leagueId: true, hohRosterId: true },
  })
  if (!cycle) return []

  const evicted = await prisma.bigBrotherCycle.findMany({
    where: { leagueId, evictedRosterId: { not: null } },
    select: { evictedRosterId: true },
  })
  const evictedIds = new Set(evicted.map((c) => c.evictedRosterId).filter(Boolean) as string[])
  const finalNoms = await getFinalNomineeRosterIds(cycleId)
  const nomSet = new Set(finalNoms)

  const rosters = await prisma.roster.findMany({
    where: { leagueId, id: { notIn: [...evictedIds] } },
    select: { id: true },
  })
  let ids = rosters.map((r) => r.id).filter((id) => !nomSet.has(id))
  if (hohVotesOnlyInTie && cycle.hohRosterId) {
    ids = ids.filter((id) => id !== cycle.hohRosterId)
  }
  return ids
}

/**
 * Submit eviction vote. Last valid vote before deadline counts (upsert). Voter must be eligible; target must be on the block.
 */
export async function submitEvictionVote(
  cycleId: string,
  voterRosterId: string,
  targetRosterId: string
): Promise<{ ok: boolean; error?: string }> {
  const cycle = await prisma.bigBrotherCycle.findUnique({
    where: { id: cycleId },
    select: { leagueId: true, configId: true, voteDeadlineAt: true, closedAt: true },
  })
  if (!cycle) return { ok: false, error: 'Cycle not found' }
  if (cycle.closedAt) return { ok: false, error: 'Voting closed' }
  if (cycle.voteDeadlineAt && new Date() > cycle.voteDeadlineAt) return { ok: false, error: 'Vote deadline passed' }

  const config = await getBigBrotherConfig(cycle.leagueId)
  if (!config) return { ok: false, error: 'Not a Big Brother league' }

  const eligible = await getEligibleVoterRosterIds(cycle.leagueId, cycleId, config.hohVotesOnlyInTie)
  if (!eligible.includes(voterRosterId)) return { ok: false, error: 'Not eligible to vote' }

  const finalNoms = await getFinalNomineeRosterIds(cycleId)
  if (!finalNoms.includes(targetRosterId)) return { ok: false, error: 'Target must be on the block' }

  await prisma.bigBrotherEvictionVote.upsert({
    where: { cycleId_voterRosterId: { cycleId, voterRosterId } },
    create: { cycleId, voterRosterId, targetRosterId },
    update: { targetRosterId },
  })
  return { ok: true }
}

/**
 * Tally votes and resolve tie: lowest season points (through this week) is evicted. Optionally apply HOH tie-break vote if configured.
 */
export async function tallyEvictionVotes(
  cycleId: string,
  seasonPointsSource: SeasonPointsSource = defaultSeasonPoints
): Promise<BigBrotherVoteTally> {
  const cycle = await prisma.bigBrotherCycle.findUnique({
    where: { id: cycleId },
    include: { votes: true },
  })
  if (!cycle) {
    return { cycleId, votesByTarget: {}, tied: false, evictedRosterId: null, tieBreakSeasonPoints: null }
  }

  const votesByTarget: Record<string, number> = {}
  for (const v of cycle.votes) {
    votesByTarget[v.targetRosterId] = (votesByTarget[v.targetRosterId] ?? 0) + 1
  }
  const targets = Object.keys(votesByTarget)
  if (targets.length === 0) {
    return { cycleId, votesByTarget: {}, tied: false, evictedRosterId: null, tieBreakSeasonPoints: null }
  }

  const maxVotes = Math.max(...Object.values(votesByTarget))
  const tiedTargets = targets.filter((t) => votesByTarget[t] === maxVotes)
  let evictedRosterId: string | null = null
  let tieBreakSeasonPoints: Record<string, number> | null = null

  const config = await getBigBrotherConfig(cycle.leagueId)
  const tieBreakMode = config?.evictionTieBreakMode ?? 'season_points'

  if (tiedTargets.length === 1) {
    evictedRosterId = tiedTargets[0]
  } else if (tiedTargets.length > 1) {
    if (tieBreakMode === 'hoh_vote' && cycle.hohRosterId) {
      const hohVote = cycle.votes.find((v) => v.voterRosterId === cycle.hohRosterId)
      if (hohVote && tiedTargets.includes(hohVote.targetRosterId)) {
        evictedRosterId = hohVote.targetRosterId
      }
    }
    if (tieBreakMode === 'random' && tiedTargets.length > 0) {
      const seed = [cycle.leagueId, cycle.configId, cycle.week, ...tiedTargets.sort()].join(':')
      let h = 0
      for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0
      evictedRosterId = tiedTargets[Math.abs(h) % tiedTargets.length]
    }
    if (!evictedRosterId) {
      const points: Record<string, number> = {}
      for (const rosterId of tiedTargets) {
        points[rosterId] = await seasonPointsSource.getSeasonPointsForRoster(
          cycle.leagueId,
          rosterId,
          cycle.week
        )
      }
      tieBreakSeasonPoints = points
      const minPoints = Math.min(...Object.values(points))
      evictedRosterId = tiedTargets.find((t) => points[t] === minPoints) ?? tiedTargets[0]
    }
  }

  return {
    cycleId,
    votesByTarget,
    tied: tiedTargets.length > 1,
    evictedRosterId,
    tieBreakSeasonPoints,
  }
}

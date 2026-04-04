/**
 * Survivor vote tally and tie-break (PROMPT 346). Deterministic.
 * Tie-break = lowest total season fantasy points to that point is eliminated.
 */

import { getRosterTeamMap } from '@/lib/zombie/rosterTeamMap'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { getScoreBoostTotalForRoster, getWeeklyEffectState } from './SurvivorEffectEngine'
import { getSurvivorConfig } from './SurvivorLeagueConfig'
import { getEligibleRosterIdsForCouncil, getTargetableRosterIdsForCouncil } from './SurvivorCouncilEligibility'
import { getLeagueSeasonForSurvivor } from './SurvivorTimelineResolver'
import type { SurvivorVoteTally } from './types'

export interface SeasonPointsSource {
  getSeasonPointsForRoster(leagueId: string, rosterId: string, throughWeek: number): Promise<number>
}

/**
 * Default season points: sum of period scores. Tries GuillotinePeriodScore first; then TeamPerformance (Roster -> teamId) for Survivor/redraft leagues.
 */
export async function getSeasonPointsFromRosterPerformance(
  leagueId: string,
  rosterId: string,
  throughWeek: number
): Promise<number> {
  const guillotineScores = await prisma.guillotinePeriodScore.findMany({
    where: { leagueId, rosterId, weekOrPeriod: { lte: throughWeek } },
    select: { periodPoints: true },
  })
  const fromGuillotine = guillotineScores.reduce((sum, s) => sum + (s.periodPoints ?? 0), 0)
  if (fromGuillotine > 0) return fromGuillotine

  const roster = await prisma.roster.findFirst({
    where: { id: rosterId, leagueId },
    select: { id: true },
  })
  if (!roster) return 0
  const map = await getRosterTeamMap(leagueId)
  const teamId = map.rosterIdToTeamId.get(rosterId)
  if (!teamId) return 0
  const season = await getLeagueSeasonForSurvivor(leagueId)
  const teamScores = await prisma.teamPerformance.findMany({
    where: { teamId, week: { lte: throughWeek }, season },
    select: { points: true },
  })
  const basePoints = teamScores.reduce((sum, s) => sum + (s.points ?? 0), 0)
  const scoreBoost = await getScoreBoostTotalForRoster(leagueId, rosterId, throughWeek)
  return basePoints + scoreBoost
}

/**
 * Tally votes for a council and resolve tie by season points (lower = eliminated).
 */
export async function tallyVotes(
  councilId: string,
  seasonPointsSource?: SeasonPointsSource
): Promise<SurvivorVoteTally> {
  const council = await prisma.survivorTribalCouncil.findUnique({
    where: { id: councilId },
    include: { votes: true },
  })
  if (!council) {
    return { councilId, votesByTarget: {}, tied: false, eliminatedRosterId: null, tieBreakSeasonPoints: null }
  }

  const idolUses = await prisma.survivorIdolLedgerEntry.findMany({
    where: {
      leagueId: council.leagueId,
      eventType: 'used',
    },
    include: {
      idol: {
        select: {
          id: true,
          powerType: true,
        },
      },
    },
  })

  const protectedRosterIds = new Set<string>()
  const extraVoteRosterIds = new Set<string>()
  const nullifiedVoteRosterIds = new Set<string>()
  const weeklyEffects = await getWeeklyEffectState(council.leagueId, council.week)
  for (const rosterId of weeklyEffects.protectedRosterIds) {
    protectedRosterIds.add(rosterId)
  }
  for (const entry of idolUses) {
    const metadata = (entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {}) as Prisma.JsonObject
    const entryCouncilId = typeof metadata.councilId === 'string' ? metadata.councilId : null
    if (entryCouncilId !== councilId) continue

    const powerType = typeof metadata.powerType === 'string' ? metadata.powerType : entry.idol.powerType
    if (powerType === 'protect_self' || powerType === 'protect_self_plus_one') {
      const protectedRosterId =
        typeof metadata.protectedRosterId === 'string' && metadata.protectedRosterId.trim()
          ? metadata.protectedRosterId
          : entry.fromRosterId
      if (protectedRosterId) {
        protectedRosterIds.add(protectedRosterId)
      }
    }
    if (powerType === 'extra_vote' && entry.fromRosterId) {
      extraVoteRosterIds.add(entry.fromRosterId)
    }
    if (powerType === 'vote_nullifier') {
      const nullifiedVoterRosterId =
        typeof metadata.nullifiedVoterRosterId === 'string' && metadata.nullifiedVoterRosterId.trim()
          ? metadata.nullifiedVoterRosterId
          : null
      if (nullifiedVoterRosterId) {
        nullifiedVoteRosterIds.add(nullifiedVoterRosterId)
      }
    }
  }

  if (council.phase === 'pre_merge' && council.attendingTribeId && weeklyEffects.immuneTribeIds.has(council.attendingTribeId)) {
    return { councilId, votesByTarget: {}, tied: false, eliminatedRosterId: null, tieBreakSeasonPoints: null }
  }

  const votesByTarget: Record<string, number> = {}
  for (const v of council.votes) {
    if (nullifiedVoteRosterIds.has(v.voterRosterId)) {
      continue
    }
    if (protectedRosterIds.has(v.targetRosterId)) {
      continue
    }
    votesByTarget[v.targetRosterId] = (votesByTarget[v.targetRosterId] ?? 0) + 1
    if (extraVoteRosterIds.has(v.voterRosterId)) {
      votesByTarget[v.targetRosterId] = (votesByTarget[v.targetRosterId] ?? 0) + 1
    }
  }
  const targets = Object.keys(votesByTarget)
  if (targets.length === 0) {
    return { councilId, votesByTarget: {}, tied: false, eliminatedRosterId: null, tieBreakSeasonPoints: null }
  }

  const maxVotes = Math.max(...Object.values(votesByTarget))
  const tiedTargets = targets.filter((t) => votesByTarget[t] === maxVotes)
  let eliminatedRosterId: string | null = null
  let tieBreakSeasonPoints: Record<string, number> | null = null

  if (tiedTargets.length === 1) {
    eliminatedRosterId = tiedTargets[0]
  } else if (tiedTargets.length > 1 && seasonPointsSource) {
    const points: Record<string, number> = {}
    for (const rosterId of tiedTargets) {
      points[rosterId] = await seasonPointsSource.getSeasonPointsForRoster(
        council.leagueId,
        rosterId,
        council.week
      )
    }
    tieBreakSeasonPoints = points
    const minPoints = Math.min(...Object.values(points))
    const lowest = tiedTargets.find((t) => points[t] === minPoints)
    eliminatedRosterId = lowest ?? tiedTargets[0]
  } else if (tiedTargets.length > 1) {
    eliminatedRosterId = tiedTargets[0]
  }

  return {
    councilId,
    votesByTarget,
    tied: tiedTargets.length > 1,
    eliminatedRosterId,
    tieBreakSeasonPoints,
  }
}

/**
 * Submit a vote (if before deadline and valid). Call from command parser after validation.
 */
export async function submitVote(
  councilId: string,
  voterRosterId: string,
  targetRosterId: string
): Promise<{ ok: boolean; error?: string }> {
  const config = await getSurvivorConfig(
    (await prisma.survivorTribalCouncil.findUnique({ where: { id: councilId }, select: { leagueId: true } }))?.leagueId ?? ''
  )
  if (!config) return { ok: false, error: 'Not a Survivor league' }

  const council = await prisma.survivorTribalCouncil.findUnique({
    where: { id: councilId },
  })
  if (!council) return { ok: false, error: 'Council not found' }
  if (council.closedAt) return { ok: false, error: 'Voting closed' }
  if (new Date() > council.voteDeadlineAt) return { ok: false, error: 'Vote deadline passed' }
  const eligibleRosterIds = await getEligibleRosterIdsForCouncil(councilId)
  if (!eligibleRosterIds.includes(voterRosterId)) {
    return { ok: false, error: 'You are not eligible to vote in this council' }
  }
  const targetableRosterIds = await getTargetableRosterIdsForCouncil(councilId)
  if (!targetableRosterIds.includes(targetRosterId)) {
    return { ok: false, error: 'That manager is not eligible to receive votes in this council' }
  }
  if (config.selfVoteDisallowed && voterRosterId === targetRosterId) return { ok: false, error: 'Self-vote not allowed' }

  await prisma.survivorVote.upsert({
    where: { councilId_voterRosterId: { councilId, voterRosterId } },
    create: { councilId, leagueId: council.leagueId, voterRosterId, targetRosterId },
    update: { targetRosterId, leagueId: council.leagueId },
  })
  return { ok: true }
}

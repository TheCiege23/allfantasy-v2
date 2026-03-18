/**
 * Survivor vote tally and tie-break (PROMPT 346). Deterministic.
 * Tie-break = lowest total season fantasy points to that point is eliminated.
 */

import { getRosterTeamMap } from '@/lib/zombie/rosterTeamMap'
import { prisma } from '@/lib/prisma'
import { getSurvivorConfig } from './SurvivorLeagueConfig'
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
  const season = new Date().getFullYear()
  const teamScores = await prisma.teamPerformance.findMany({
    where: { teamId, week: { lte: throughWeek }, season },
    select: { points: true },
  })
  return teamScores.reduce((sum, s) => sum + (s.points ?? 0), 0)
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

  const votesByTarget: Record<string, number> = {}
  for (const v of council.votes) {
    votesByTarget[v.targetRosterId] = (votesByTarget[v.targetRosterId] ?? 0) + 1
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
  if (config.selfVoteDisallowed && voterRosterId === targetRosterId) return { ok: false, error: 'Self-vote not allowed' }

  await prisma.survivorVote.upsert({
    where: { councilId_voterRosterId: { councilId, voterRosterId } },
    create: { councilId, voterRosterId, targetRosterId },
    update: { targetRosterId },
  })
  return { ok: true }
}

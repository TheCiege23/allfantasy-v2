/**
 * Survivor challenge/mini-game: create, lock, score, apply rewards (PROMPT 346). Deterministic.
 */

import { prisma } from '@/lib/prisma'
import { getSurvivorConfig } from './SurvivorLeagueConfig'
import { appendSurvivorAudit } from './SurvivorAuditLog'
import { applyChallengeRewards } from './SurvivorEffectEngine'
import { getMinigameDef } from './SurvivorMiniGameRegistry'
import type { SurvivorChallengeType } from './types'

/**
 * Create a challenge for the week.
 */
export async function createChallenge(
  leagueId: string,
  week: number,
  challengeType: SurvivorChallengeType,
  configJson: Record<string, unknown>,
  lockAt?: Date
): Promise<{ ok: boolean; challengeId?: string; error?: string }> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a Survivor league' }

  const existing = await prisma.survivorChallenge.findFirst({
    where: { configId: config.configId, week, challengeType },
  })
  if (existing) return { ok: false, error: 'Challenge already exists' }

  const challenge = await prisma.survivorChallenge.create({
    data: {
      leagueId,
      configId: config.configId,
      week,
      challengeType,
      configJson: configJson as object,
      lockAt: lockAt ?? null,
    },
  })
  return { ok: true, challengeId: challenge.id }
}

/**
 * Submit an answer (roster or tribe). Fails if locked.
 */
export async function submitChallengeAnswer(
  challengeId: string,
  rosterId: string | null,
  tribeId: string | null,
  submission: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const challenge = await prisma.survivorChallenge.findUnique({
    where: { id: challengeId },
  })
  if (!challenge) return { ok: false, error: 'Challenge not found' }
  if (challenge.lockAt && new Date() >= challenge.lockAt) return { ok: false, error: 'Challenge locked' }
  if (!rosterId && !tribeId) return { ok: false, error: 'Need rosterId or tribeId' }

  const definition = getMinigameDef(challenge.challengeType as SurvivorChallengeType)
  if (definition?.submissionScope === 'roster' && !rosterId) {
    return { ok: false, error: 'This challenge requires an individual roster submission' }
  }
  if (definition?.submissionScope === 'tribe' && !tribeId) {
    return { ok: false, error: 'This challenge requires a tribe submission' }
  }
  if (definition?.submissionScope === 'roster' && tribeId) {
    return { ok: false, error: 'Tribe submissions are not allowed for this challenge' }
  }

  if (rosterId) {
    const roster = await prisma.roster.findFirst({
      where: { id: rosterId, leagueId: challenge.leagueId },
      select: { id: true },
    })
    if (!roster) return { ok: false, error: 'Roster not found for this challenge' }
  }

  if (tribeId) {
    const tribe = await prisma.survivorTribe.findFirst({
      where: { id: tribeId, leagueId: challenge.leagueId },
      select: { id: true },
    })
    if (!tribe) return { ok: false, error: 'Tribe not found for this challenge' }
  }

  if (rosterId) {
    const existing = await prisma.survivorChallengeSubmission.findUnique({
      where: { uniq_challenge_roster: { challengeId, rosterId } },
    })
    if (existing) return { ok: false, error: 'Already submitted' }
  } else if (tribeId) {
    const existing = await prisma.survivorChallengeSubmission.findFirst({
      where: { challengeId, tribeId },
    })
    if (existing) return { ok: false, error: 'Already submitted' }
  }

  await prisma.survivorChallengeSubmission.create({
    data: {
      challengeId,
      rosterId: rosterId ?? null,
      tribeId: tribeId ?? null,
      submission: submission as object,
    },
  })
  return { ok: true }
}

/**
 * Resolve challenge and store result (e.g. after games complete). resultJson = { winnerRosterId?, winnerTribeId?, rewards?: [] }.
 */
export async function resolveChallenge(
  challengeId: string,
  resultJson: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const challenge = await prisma.survivorChallenge.findUnique({
    where: { id: challengeId },
  })
  if (!challenge) return { ok: false, error: 'Challenge not found' }

  const existingResult =
    challenge.resultJson && typeof challenge.resultJson === 'object' && !Array.isArray(challenge.resultJson)
      ? (challenge.resultJson as Record<string, unknown>)
      : null
  const existingAppliedRewards = Array.isArray(existingResult?.appliedRewards)
    ? (existingResult?.appliedRewards as Record<string, unknown>[])
    : null
  const appliedRewards =
    existingAppliedRewards && existingAppliedRewards.length > 0
      ? existingAppliedRewards
      : await applyChallengeRewards(challengeId, resultJson)

  const nextResultJson: Record<string, unknown> = {
    ...resultJson,
    appliedRewards,
  }

  await prisma.survivorChallenge.update({
    where: { id: challengeId },
    data: { resultJson: nextResultJson as object },
  })

  const config = await getSurvivorConfig(challenge.leagueId)
  if (config) {
    await appendSurvivorAudit(challenge.leagueId, config.configId, 'challenge_resolved' as any, {
      challengeId,
      week: challenge.week,
      challengeType: challenge.challengeType,
      appliedRewardCount: appliedRewards.length,
    })
  }
  return { ok: true }
}

/**
 * Get challenges for a week.
 */
export async function getChallengesForWeek(leagueId: string, week: number) {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return []
  return prisma.survivorChallenge.findMany({
    where: { configId: config.configId, week },
    orderBy: [{ createdAt: 'asc' }],
    include: { submissions: true },
  })
}

export async function getCurrentOpenChallengesForWeek(leagueId: string, week: number) {
  const challenges = await getChallengesForWeek(leagueId, week)
  return challenges.filter((challenge) => !challenge.resultJson && (!challenge.lockAt || new Date() < challenge.lockAt))
}

export async function getChallengeById(challengeId: string) {
  return prisma.survivorChallenge.findUnique({
    where: { id: challengeId },
    include: { submissions: true },
  })
}

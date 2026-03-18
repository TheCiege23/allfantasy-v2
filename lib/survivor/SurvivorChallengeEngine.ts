/**
 * Survivor challenge/mini-game: create, lock, score, apply rewards (PROMPT 346). Deterministic.
 */

import { prisma } from '@/lib/prisma'
import { getSurvivorConfig } from './SurvivorLeagueConfig'
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

  await prisma.survivorChallenge.update({
    where: { id: challengeId },
    data: { resultJson: resultJson as object },
  })
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
    include: { submissions: true },
  })
}

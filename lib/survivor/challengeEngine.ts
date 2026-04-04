import { prisma } from '@/lib/prisma'
import { createChallenge as createChallengeCore, submitChallengeAnswer } from './SurvivorChallengeEngine'
import type { SurvivorChallengeType } from './types'
import { postHostMessage } from './hostEngine'

export type ChallengeResult = { challengeId: string; winners: string[] }

export async function createWeeklyChallenge(
  leagueId: string,
  week: number,
  mode: 'auto' | 'manual',
): Promise<{ id: string }> {
  if (mode === 'manual') {
    const cfg = await prisma.survivorLeagueConfig.findUnique({ where: { leagueId } })
    if (!cfg) throw new Error('No survivor config')
    const shell = await prisma.survivorChallenge.create({
      data: {
        leagueId,
        configId: cfg.id,
        week,
        challengeNumber: 1,
        challengeType: 'trivia',
        title: 'Commissioner challenge',
        description: 'Fill in details in commissioner tools.',
        instructions: 'TBD',
        status: 'open',
      },
    })
    return { id: shell.id }
  }

  const created = await createChallengeCore(leagueId, week, 'score_prediction' as SurvivorChallengeType, {}, undefined)
  if (!created.ok || !created.challengeId) throw new Error(created.error ?? 'Challenge failed')
  await prisma.survivorChallenge.update({
    where: { id: created.challengeId },
    data: { status: 'open', locksAt: new Date(Date.now() + 86400000) },
  })
  await postHostMessage(leagueId, 'challenge_post', { week }, 'league_chat').catch(() => {})
  return { id: created.challengeId }
}

export async function lockChallengeSubmissions(challengeId: string): Promise<void> {
  await prisma.survivorChallengeSubmission.updateMany({
    where: { challengeId },
    data: { isLocked: true },
  })
  await prisma.survivorChallenge.update({
    where: { id: challengeId },
    data: { status: 'locked', lockAt: new Date() },
  })
}

export async function tallyChallengeResults(challengeId: string): Promise<ChallengeResult> {
  const ch = await prisma.survivorChallenge.findUnique({ where: { id: challengeId } })
  if (!ch) throw new Error('Not found')
  await prisma.survivorChallenge.update({
    where: { id: challengeId },
    data: {
      status: 'complete',
      resultJson: { talliedAt: new Date().toISOString(), note: 'Wire scoring hooks per challenge type.' } as object,
    },
  })
  return { challengeId, winners: [] }
}

export { submitChallengeAnswer }

/**
 * AF Commissioner Subscription — AI-generated weekly challenges.
 */

import { prisma } from '@/lib/prisma'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'
import type { NextResponse } from 'next/server'

export type GeneratedChallenge = {
  type: string
  title: string
  description: string
  instructions: string
  reward: { type: string; amount?: number; description?: string }
  penalty: { type: string; description: string } | null
  correctAnswerLogic: string
}

export async function generateWeeklyChallenge(
  leagueId: string,
  week: number,
  sport: string,
  phase: string,
): Promise<GeneratedChallenge | NextResponse> {
  const gate = await requireAfSub()
  if (typeof gate !== 'string') return gate

  const post = phase === 'merge' || phase === 'jury' || phase === 'finale'
  const validity = post ? 'post_merge' : 'pre_merge'
  const templates = await prisma.survivorChallengeTemplate.findMany({
    where: { aiCanAutoGenerate: true, phaseValidity: validity },
    take: 24,
  })
  const pick = templates[week % Math.max(1, templates.length)] ?? null

  return {
    type: pick?.challengeKey ?? 'prediction',
    title: pick?.name ?? `Week ${week} ${sport} pick`,
    description: pick?.theme ?? `Survivor mini-challenge for ${phase} phase.`,
    instructions:
      pick?.inputDescription ?? 'Reply with JSON { "pick": "..." } before lock.',
    reward: {
      type: pick?.defaultRewardType || 'faab',
      amount: 1,
      description: pick?.defaultRewardType ? String(pick.defaultRewardType) : '+1 FAAB',
    },
    penalty: pick?.defaultPenaltyType
      ? { type: 'penalty', description: String(pick.defaultPenaltyType) }
      : null,
    correctAnswerLogic: `Resolved from official box score after games. Catalog: ${pick?.challengeKey ?? 'generic'}; league=${leagueId}; week=${week}.`,
  }
}

/**
 * AF Commissioner Subscription — AI-generated weekly challenges.
 */

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

  return {
    type: 'prediction',
    title: `Week ${week} ${sport} pick`,
    description: `Survivor mini-challenge for ${phase} phase.`,
    instructions: 'Reply with JSON { "pick": "..." } before lock.',
    reward: { type: 'faab', amount: 1, description: '+1 FAAB' },
    penalty: null,
    correctAnswerLogic: 'Resolved from official box score after games.',
  }
}

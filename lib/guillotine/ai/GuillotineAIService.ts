/**
 * Guillotine AI service: call LLM with deterministic context only.
 * Returns explanation/strategy text. No elimination or standings logic.
 * PROMPT 334.
 */

import OpenAI from 'openai'
import { withOfficialTimeUserMessage } from '@/lib/time-engine/chimmyPromptPrefix'
import type { GuillotineAIDeterministicContext } from './GuillotineAIContext'
import { buildPromptForType } from './GuillotineAIPrompts'

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

export type GuillotineAIType = 'draft' | 'survival' | 'waiver' | 'recap' | 'orphan'

export interface GuillotineAIResult {
  explanation: string
  model?: string
}

/**
 * Generate AI explanation/strategy from deterministic context. No elimination math.
 */
export async function generateGuillotineAI(
  ctx: GuillotineAIDeterministicContext,
  type: GuillotineAIType,
  userId?: string | null
): Promise<GuillotineAIResult> {
  const { system, user } = buildPromptForType(type, ctx)
  const userContent = userId ? await withOfficialTimeUserMessage(userId, user) : user
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ],
    max_tokens: 500,
    temperature: 0.5,
  })
  const explanation = completion.choices[0]?.message?.content?.trim() ?? 'No explanation generated.'
  return {
    explanation,
    model: completion.model ?? undefined,
  }
}

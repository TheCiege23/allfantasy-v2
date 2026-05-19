/**
 * Guillotine AI service: call LLM with deterministic context only.
 * Returns explanation/strategy text. No elimination or standings logic.
 * PROMPT 334.
 */

import OpenAI from 'openai'
import { withOfficialTimeUserMessage } from '@/lib/time-engine/chimmyPromptPrefix'
import type { GuillotineAIDeterministicContext } from './GuillotineAIContext'
import { buildPromptForType } from './GuillotineAIPrompts'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) return null
  if (!openai) {
    openai = new OpenAI({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    })
  }
  return openai
}

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
  const client = getOpenAIClient()
  if (!client) {
    return {
      explanation: 'AI strategy is unavailable because OpenAI is not configured. Use the deterministic danger tiers, standings, and recent chop events shown above.',
      model: 'deterministic-fallback',
    }
  }

  const { system, user } = buildPromptForType(type, ctx)
  const userContent = userId ? await withOfficialTimeUserMessage(userId, user) : user
  const completion = await client.chat.completions.create({
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

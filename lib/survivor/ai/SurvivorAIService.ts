/**
 * Survivor AI service: call LLM with deterministic context only.
 * Returns narrative/explanation only. No elimination, vote, idol, immunity, or exile-return logic.
 * PROMPT 348.
 */

import OpenAI from 'openai'
import type { SurvivorAIDeterministicContext } from './SurvivorAIContext'
import type { SurvivorAIType } from './SurvivorAIContext'
import { buildSurvivorAIPrompt } from './SurvivorAIPrompts'

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

export interface SurvivorAIResult {
  narrative: string
  model?: string
}

/**
 * Generate AI narrative/explanation from deterministic context. No outcome logic.
 */
export async function generateSurvivorAI(
  ctx: SurvivorAIDeterministicContext,
  type: SurvivorAIType
): Promise<SurvivorAIResult> {
  const { system, user } = buildSurvivorAIPrompt(ctx, type)
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: 600,
    temperature: 0.6,
  })
  const narrative = completion.choices[0]?.message?.content?.trim() ?? 'No narrative generated.'
  return {
    narrative,
    model: completion.model ?? undefined,
  }
}

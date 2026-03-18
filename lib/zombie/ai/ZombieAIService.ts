/**
 * Zombie AI service: call LLM with deterministic context only. PROMPT 355.
 * No infection, serum/weapon/ambush legality, promotion/relegation, trade, or drop enforcement.
 */

import OpenAI from 'openai'
import type { ZombieAIDeterministicContext } from './ZombieAIContext'
import type { ZombieAIType } from './ZombieAIContext'
import type { ZombieUniverseAIDeterministicContext } from './ZombieAIContext'
import type { ZombieUniverseAIType } from './ZombieAIContext'
import { buildZombieAIPrompt, buildZombieUniverseAIPrompt } from './ZombieAIPrompts'

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

export interface ZombieAIResult {
  narrative: string
  model?: string
}

/**
 * Generate league-scoped Zombie AI narrative/advice from deterministic context.
 */
export async function generateZombieAI(
  ctx: ZombieAIDeterministicContext,
  type: ZombieAIType
): Promise<ZombieAIResult> {
  const { system, user } = buildZombieAIPrompt(ctx, type)
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: 500,
    temperature: 0.5,
  })
  const narrative = completion.choices[0]?.message?.content?.trim() ?? 'No narrative generated.'
  return {
    narrative,
    model: completion.model ?? undefined,
  }
}

/**
 * Generate universe-scoped Zombie AI narrative from deterministic context.
 */
export async function generateZombieUniverseAI(
  ctx: ZombieUniverseAIDeterministicContext,
  type: ZombieUniverseAIType
): Promise<ZombieAIResult> {
  const { system, user } = buildZombieUniverseAIPrompt(ctx, type)
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: 500,
    temperature: 0.5,
  })
  const narrative = completion.choices[0]?.message?.content?.trim() ?? 'No narrative generated.'
  return {
    narrative,
    model: completion.model ?? undefined,
  }
}

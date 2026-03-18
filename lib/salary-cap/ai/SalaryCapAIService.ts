/**
 * Salary Cap AI service: call LLM with deterministic context only.
 * Returns explanation/strategy text. No cap or contract logic. PROMPT 341.
 */

import OpenAI from 'openai'
import type { SalaryCapAIDeterministicContext } from './SalaryCapAIContext'
import type { SalaryCapAIContextType } from './SalaryCapAIContext'
import { buildPromptForType } from './SalaryCapAIPrompts'

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

export interface SalaryCapAIResult {
  explanation: string
  model?: string
}

/**
 * Generate AI explanation/strategy from deterministic context. No cap/contract computation.
 */
export async function generateSalaryCapAI(
  ctx: SalaryCapAIDeterministicContext,
  type: SalaryCapAIContextType
): Promise<SalaryCapAIResult> {
  const { system, user } = buildPromptForType(type, ctx)
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: 600,
    temperature: 0.5,
  })
  const explanation = completion.choices[0]?.message?.content?.trim() ?? 'No explanation generated.'
  return {
    explanation,
    model: completion.model ?? undefined,
  }
}

import Anthropic from '@anthropic-ai/sdk'
import { parseJsonFromClaudeText } from './json-parse'

export const LEAGUE_AI_MODEL = 'claude-sonnet-4-20250514'
export const LEAGUE_AI_MAX_TOKENS = 1000

export async function callClaudeJson(args: {
  system: string
  user: string
}): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const anthropic = new Anthropic({ apiKey })
  const msg = await anthropic.messages.create({
    model: LEAGUE_AI_MODEL,
    max_tokens: LEAGUE_AI_MAX_TOKENS,
    system: args.system,
    messages: [{ role: 'user', content: args.user }],
  })

  const block = msg.content[0]
  const text = block?.type === 'text' ? block.text : ''
  if (!text) {
    throw new Error('Empty response from model')
  }
  return parseJsonFromClaudeText(text)
}

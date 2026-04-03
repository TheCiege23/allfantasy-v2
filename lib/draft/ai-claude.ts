import Anthropic from '@anthropic-ai/sdk'

export const DRAFT_AI_MODEL = 'claude-sonnet-4-20250514'
export const DRAFT_AI_MAX_TOKENS = 1000

export async function draftAiText(system: string, user: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }
  const anthropic = new Anthropic({ apiKey })
  const msg = await anthropic.messages.create({
    model: DRAFT_AI_MODEL,
    max_tokens: DRAFT_AI_MAX_TOKENS,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const block = msg.content[0]
  return block?.type === 'text' ? block.text : ''
}

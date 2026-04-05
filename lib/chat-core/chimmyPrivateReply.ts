import 'server-only'

import { openaiChatText } from '@/lib/openai-client'
import { stripChimmyMentionPrefix } from '@/lib/chat-core/mentionPrivacyFilter'

/**
 * Short Chimmy reply for private @chimmy league chat (only sender sees messages).
 */
export async function generateChimmyPrivateReply(prompt: string, _leagueId: string): Promise<string> {
  const userContent = stripChimmyMentionPrefix(prompt).slice(0, 4000)
  if (!userContent.trim()) {
    return "Hey — what would you like help with? Add your question after @chimmy."
  }

  const result = await openaiChatText({
    temperature: 0.5,
    maxTokens: 600,
    messages: [
      {
        role: 'system',
        content:
          'You are Chimmy, the calm, analytical AI assistant for AllFantasy fantasy sports. Be concise, helpful, and never invent player or league stats. If context is missing, ask a brief clarifying question.',
      },
      { role: 'user', content: userContent },
    ],
  })

  if (result.ok && result.text.trim()) {
    return result.text.trim()
  }

  return "I'm having trouble reaching the AI right now. Try again in a moment, or open the full Chimmy panel from the dashboard."
}

/**
 * Chat history for Chimmy memory context. Stub: returns empty until backed by a store.
 * PROMPT 234.
 */

export interface ChatHistoryMessage {
  role: string
  content: string
}

/**
 * Get recent messages for a conversation (for prompt context). Returns empty if no store.
 */
export async function getRecentChatHistory(
  _conversationId: string,
  _limit: number
): Promise<ChatHistoryMessage[]> {
  return []
}

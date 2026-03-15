/**
 * MentionNotificationBridge — call mentions API after sending a message so mentioned users get notified.
 */

export const MENTIONS_ENDPOINT = "/api/shared/chat/mentions"

export function getMentionsPayload(threadId: string, messageId: string, mentionedUsernames: string[]): {
  threadId: string
  messageId: string
  mentionedUsernames: string[]
} {
  return {
    threadId,
    messageId,
    mentionedUsernames: mentionedUsernames.filter(Boolean),
  }
}

export async function notifyMentions(
  threadId: string,
  messageId: string,
  mentionedUsernames: string[]
): Promise<{ notified: number }> {
  if (mentionedUsernames.length === 0) return { notified: 0 }
  const res = await fetch(MENTIONS_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(getMentionsPayload(threadId, messageId, mentionedUsernames)),
  })
  const data = await res.json().catch(() => ({}))
  return { notified: data?.notified ?? 0 }
}

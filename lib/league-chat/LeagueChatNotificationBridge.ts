/**
 * LeagueChatNotificationBridge — trigger notifications for league chat events.
 * Mentions: POST /api/shared/chat/mentions with threadId, messageId, mentionedUsernames.
 * Trade/waiver notices: created by backend or cron; this module documents the contract.
 */

export const LEAGUE_CHAT_MENTIONS_ENDPOINT = "/api/shared/chat/mentions"

export function getMentionsPayload(threadId: string, messageId: string, mentionedUsernames: string[]) {
  return { threadId, messageId, mentionedUsernames: mentionedUsernames.filter(Boolean) }
}

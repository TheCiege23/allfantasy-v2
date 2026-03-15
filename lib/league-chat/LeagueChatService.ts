/**
 * LeagueChatService — URLs, payloads, and thread resolution for league chat.
 * Works with both platform thread UUIDs and virtual league:leagueId rooms.
 */

import { isLeagueVirtualRoom } from "@/lib/chat-core"

export const LEAGUE_CHAT_MESSAGES_LIMIT = 80
export const LEAGUE_CHAT_POLL_INTERVAL_MS = 8000

export function getLeagueChatMessagesUrl(threadId: string, limit = LEAGUE_CHAT_MESSAGES_LIMIT): string {
  return `/api/shared/chat/threads/${encodeURIComponent(threadId)}/messages?limit=${limit}`
}

export function getLeagueChatPinnedUrl(threadId: string): string {
  return `/api/shared/chat/threads/${encodeURIComponent(threadId)}/pinned`
}

export function getLeagueChatSendPayload(body: string, messageType = "text"): { body: string; messageType: string } {
  return { body: body.trim(), messageType }
}

export function getLeagueChatPinPayload(messageId: string): { messageId: string } {
  return { messageId }
}

export function getLeagueChatBroadcastPayload(announcement: string, leagueIds: string[], notifyEveryone = true) {
  return { announcement: announcement.trim(), notifyEveryone, leagueIds }
}

/** Whether this thread uses bracket league backend (virtual room); pin/broadcast/reactions may differ. */
export function isLeagueVirtualChat(threadId: string): boolean {
  return isLeagueVirtualRoom(threadId)
}

/**
 * ConversationSafetyResolver — URLs and payloads for block, unblock, report.
 */

import type { PlatformChatThread } from "@/types/platform-shared"

export const BLOCK_API = "/api/shared/chat/block"
export const UNBLOCK_API = "/api/shared/chat/unblock"
export const BLOCKED_LIST_API = "/api/shared/chat/blocked"
export const REPORT_MESSAGE_API = "/api/shared/chat/report/message"
export const REPORT_USER_API = "/api/shared/chat/report/user"

export function getBlockPayload(blockedUserId: string): { blockedUserId: string } {
  return { blockedUserId }
}

export function getUnblockPayload(blockedUserId: string): { blockedUserId: string } {
  return { blockedUserId }
}

export function getReportMessagePayload(
  messageId: string,
  threadId: string,
  reason: string
): { messageId: string; threadId: string; reason: string } {
  return { messageId, threadId, reason: reason.trim().slice(0, 500) }
}

export function getReportUserPayload(reportedUserId: string, reason: string): { reportedUserId: string; reason: string } {
  return { reportedUserId, reason: reason.trim().slice(0, 500) }
}

export function isBlockedDirectConversation(
  thread: PlatformChatThread | null | undefined,
  blockedUserIds: Set<string>
): boolean {
  if (!thread || thread.threadType !== "dm") return false
  const context = (thread.context || {}) as { otherUserId?: string | null }
  const otherUserId = typeof context.otherUserId === "string" ? context.otherUserId : null
  if (!otherUserId) return false
  return blockedUserIds.has(otherUserId)
}

export function getBlockedConversationNotice(displayName?: string | null): string {
  if (displayName && displayName.trim()) {
    return `You blocked ${displayName}. Unblock to resume direct messages.`
  }
  return "This conversation is blocked. Unblock to resume direct messages."
}

export function getBlockedVisibilityNotice(blockedCount: number): string {
  if (blockedCount <= 0) return ""
  return blockedCount === 1
    ? "Content from one blocked user is hidden for your safety."
    : `Content from ${blockedCount} blocked users is hidden for your safety.`
}

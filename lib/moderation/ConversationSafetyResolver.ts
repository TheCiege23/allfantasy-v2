/**
 * ConversationSafetyResolver — URLs and payloads for block, unblock, report.
 */

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

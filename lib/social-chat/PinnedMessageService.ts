/**
 * PinnedMessageService — URLs and display for pinned messages (platform threads).
 */

import type { PlatformChatMessage } from "@/types/platform-shared"

export function getPinnedUrl(threadId: string): string {
  return `/api/shared/chat/threads/${encodeURIComponent(threadId)}/pinned`
}

export function getPinUrl(threadId: string): string {
  return `/api/shared/chat/threads/${encodeURIComponent(threadId)}/pin`
}

export function getUnpinUrl(threadId: string): string {
  return `/api/shared/chat/threads/${encodeURIComponent(threadId)}/unpin`
}

export function getPinPayload(messageId: string): { messageId: string } {
  return { messageId }
}

export function getUnpinPayload(pinMessageId: string): { pinMessageId: string } {
  return { pinMessageId }
}

export function getPinnedDisplayBody(msg: PlatformChatMessage): string {
  const body = msg.body || ""
  try {
    const parsed = JSON.parse(body)
    if (typeof parsed.snippet === "string") return parsed.snippet
    if (parsed.messageId) return "Pinned message"
  } catch {
    // use body as-is
  }
  return body || "Pinned message"
}

export function getReferencedMessageIdFromPin(pinMessage: PlatformChatMessage): string | null {
  try {
    const parsed = JSON.parse(pinMessage.body || "{}")
    return typeof parsed.messageId === "string" ? parsed.messageId : null
  } catch {
    return null
  }
}

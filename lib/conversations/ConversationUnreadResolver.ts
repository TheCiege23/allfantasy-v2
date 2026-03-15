/**
 * ConversationUnreadResolver — unread count and badge display.
 * Backend may populate unreadCount on thread; this module provides display helpers.
 */

import type { PlatformChatThread } from "@/types/platform-shared"

export function getUnreadCount(thread: PlatformChatThread): number {
  return Math.max(0, Number(thread.unreadCount ?? 0))
}

export function hasUnread(thread: PlatformChatThread): boolean {
  return getUnreadCount(thread) > 0
}

export function getUnreadBadgeLabel(count: number, max = 99): string {
  if (count <= 0) return ""
  if (count > max) return `${max}+`
  return String(count)
}

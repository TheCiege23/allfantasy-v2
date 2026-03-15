/**
 * ConversationListResolver — filter and sort threads for DM vs group list.
 */

import type { PlatformChatThread } from "@/types/platform-shared"

export type ConversationType = "dm" | "group"

export function filterThreadsByType(
  threads: PlatformChatThread[],
  type: ConversationType
): PlatformChatThread[] {
  return threads.filter((t) => t.threadType === type)
}

export function getDMThreads(threads: PlatformChatThread[]): PlatformChatThread[] {
  return filterThreadsByType(threads, "dm")
}

export function getGroupThreads(threads: PlatformChatThread[]): PlatformChatThread[] {
  return filterThreadsByType(threads, "group")
}

export function sortThreadsByLastMessage(threads: PlatformChatThread[]): PlatformChatThread[] {
  return [...threads].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  )
}

export function getConversationDisplayTitle(thread: PlatformChatThread): string {
  return thread.title?.trim() || (thread.threadType === "dm" ? "Direct message" : "Group chat")
}

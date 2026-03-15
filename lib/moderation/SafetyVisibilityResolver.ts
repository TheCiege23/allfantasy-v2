/**
 * SafetyVisibilityResolver — apply block list to thread list and message list.
 */

import type { PlatformChatThread, PlatformChatMessage } from "@/types/platform-shared"

/**
 * Filter out threads that are DMs with a blocked user (other participant is in blockSet).
 * For group threads, we still show the thread but messages from blocked users are filtered elsewhere.
 */
export function filterThreadsByBlocked(
  threads: PlatformChatThread[],
  blockSet: Set<string>,
  currentUserId: string | null
): PlatformChatThread[] {
  if (!currentUserId || blockSet.size === 0) return threads
  return threads.filter((t) => {
    const ctx = t.context as { otherUserId?: string } | undefined
    const otherUserId = ctx?.otherUserId
    if (!otherUserId) return true
    return !blockSet.has(otherUserId)
  })
}

/**
 * Filter out messages sent by blocked users.
 */
export function filterMessagesByBlocked(
  messages: PlatformChatMessage[],
  blockSet: Set<string>
): PlatformChatMessage[] {
  if (blockSet.size === 0) return messages
  return messages.filter((m) => !m.senderUserId || !blockSet.has(m.senderUserId))
}

/**
 * Return a placeholder message for "hidden blocked user" if you want to show something in the list.
 */
export function getBlockedMessagePlaceholder(): PlatformChatMessage {
  return {
    id: "__blocked__",
    threadId: "",
    senderUserId: null,
    senderName: "Hidden",
    messageType: "system",
    body: "Message hidden because this user is blocked.",
    createdAt: new Date(0).toISOString(),
  }
}

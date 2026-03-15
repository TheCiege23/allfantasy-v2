/**
 * ReactionService — URLs and helpers for message reactions.
 */

export type ReactionEntry = { emoji: string; count: number; userIds?: string[] }

export function getReactionsFromMetadata(metadata: Record<string, unknown> | null | undefined): ReactionEntry[] {
  const raw = metadata?.reactions
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r) => r && typeof (r as ReactionEntry).emoji === "string" && typeof (r as ReactionEntry).count === "number")
    .map((r) => ({
      emoji: (r as ReactionEntry).emoji,
      count: (r as ReactionEntry).count,
      userIds: Array.isArray((r as ReactionEntry).userIds) ? (r as ReactionEntry).userIds : undefined,
    }))
}

export function getAddReactionUrl(threadId: string, messageId: string): string {
  return `/api/shared/chat/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}/reactions`
}

export function getRemoveReactionUrl(threadId: string, messageId: string): string {
  return getAddReactionUrl(threadId, messageId)
}

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const

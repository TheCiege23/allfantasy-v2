/**
 * ParticipantSelectorService — resolve display names for DM/group participants.
 * Thread title may be null for DM; context or separate API can provide other participant name.
 */

import type { PlatformChatThread } from "@/types/platform-shared"

export function getParticipantDisplayName(
  thread: PlatformChatThread,
  currentUserId: string | null
): string {
  const title = thread.title?.trim()
  if (title) return title
  if (thread.threadType === "dm" && thread.context) {
    const otherName = (thread.context as { otherDisplayName?: string }).otherDisplayName
    if (otherName) return otherName
  }
  return thread.memberCount === 2 ? "Direct message" : "Group chat"
}

export const PARTICIPANT_SEARCH_MIN_QUERY = 2

export function canSearchParticipants(query: string): boolean {
  return query.trim().length >= PARTICIPANT_SEARCH_MIN_QUERY
}

export function parseParticipantUsernames(input: string): string[] {
  const raw = input
    .split(/[\s,]+/)
    .map((entry) => entry.trim().replace(/^@+/, ""))
    .filter(Boolean)
  return Array.from(new Set(raw))
}

export function filterParticipantsByQuery(
  participants: Array<{ username: string; displayName?: string | null }>,
  query: string,
): Array<{ username: string; displayName?: string | null }> {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return participants
  return participants.filter((participant) => {
    const byUsername = participant.username.toLowerCase().includes(normalized)
    const byDisplayName = (participant.displayName || "").toLowerCase().includes(normalized)
    return byUsername || byDisplayName
  })
}

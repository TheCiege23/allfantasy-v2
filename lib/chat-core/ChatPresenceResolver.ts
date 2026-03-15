/**
 * ChatPresenceResolver — placeholder for typing/online presence.
 * Future: integrate with presence API or WebSocket.
 */

export type PresenceStatus = "online" | "away" | "offline"

export interface ChatPresence {
  userId: string
  status: PresenceStatus
  lastSeenAt: string | null
  typing?: boolean
}

export function getPresenceStatus(lastSeenAt: Date | string | null): PresenceStatus {
  if (!lastSeenAt) return "offline"
  const diff = Date.now() - new Date(lastSeenAt).getTime()
  if (diff < 60_000) return "online"
  if (diff < 300_000) return "away"
  return "offline"
}

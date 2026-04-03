/** Format message time: today → "9:41 PM"; older → "Mon 9:41 PM" */
export function formatChatMessageTimestamp(createdMs: number): string {
  const d = new Date(createdMs)
  const now = new Date()
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  const timeStr = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  if (sameDay) return timeStr
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" })
  return `${weekday} ${timeStr}`
}

/** Consecutive same-sender styling within this window (ms). */
export const CHAT_THREAD_GROUP_MS = 5 * 60 * 1000

export function isLeagueMessageThreaded(
  prev: { authorId: string; created: number } | undefined,
  curr: { authorId: string; created: number }
): boolean {
  if (!prev) return false
  if (prev.authorId !== curr.authorId) return false
  return curr.created - prev.created <= CHAT_THREAD_GROUP_MS && curr.created >= prev.created
}

export function isChimmyMessageThreaded(
  prev: { role: "user" | "assistant"; createdAt: number } | undefined,
  curr: { role: "user" | "assistant"; createdAt: number }
): boolean {
  if (!prev) return false
  if (prev.role !== curr.role) return false
  return curr.createdAt - prev.createdAt <= CHAT_THREAD_GROUP_MS && curr.createdAt >= prev.createdAt
}

type TypingSnapshot = {
  userId: string
  displayName: string | null
  username: string | null
  expiresAt: number
}

type ReadSnapshot = {
  userId: string
  lastReadAt: string
}

const typingByThread = new Map<string, Map<string, TypingSnapshot>>()
const virtualReadByThread = new Map<string, Map<string, ReadSnapshot>>()

const TYPING_TTL_MS = 10_000

function cleanupTyping(threadId: string): Map<string, TypingSnapshot> {
  const map = typingByThread.get(threadId) ?? new Map<string, TypingSnapshot>()
  const now = Date.now()
  for (const [userId, snapshot] of map.entries()) {
    if (snapshot.expiresAt <= now) {
      map.delete(userId)
    }
  }
  if (map.size === 0) {
    typingByThread.delete(threadId)
  } else {
    typingByThread.set(threadId, map)
  }
  return map
}

export function setThreadTypingState(params: {
  threadId: string
  userId: string
  displayName?: string | null
  username?: string | null
  isTyping: boolean
  ttlMs?: number
}): void {
  const threadId = String(params.threadId || "").trim()
  const userId = String(params.userId || "").trim()
  if (!threadId || !userId) return

  const map = cleanupTyping(threadId)
  if (!params.isTyping) {
    map.delete(userId)
    if (map.size === 0) typingByThread.delete(threadId)
    return
  }

  map.set(userId, {
    userId,
    displayName: params.displayName ?? null,
    username: params.username ?? null,
    expiresAt: Date.now() + Math.max(1000, params.ttlMs ?? TYPING_TTL_MS),
  })
  typingByThread.set(threadId, map)
}

export function getThreadTypingState(threadId: string, excludeUserId?: string): TypingSnapshot[] {
  const cleaned = cleanupTyping(threadId)
  const list = Array.from(cleaned.values())
  if (!excludeUserId) return list
  return list.filter((entry) => entry.userId !== excludeUserId)
}

export function markVirtualThreadRead(threadId: string, userId: string, at?: Date): void {
  const id = String(threadId || "").trim()
  const uid = String(userId || "").trim()
  if (!id || !uid) return
  const map = virtualReadByThread.get(id) ?? new Map<string, ReadSnapshot>()
  map.set(uid, {
    userId: uid,
    lastReadAt: (at ?? new Date()).toISOString(),
  })
  virtualReadByThread.set(id, map)
}

export function getVirtualThreadReadReceipts(threadId: string): ReadSnapshot[] {
  const map = virtualReadByThread.get(threadId)
  if (!map) return []
  return Array.from(map.values())
}

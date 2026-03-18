/**
 * In-memory TTL cache for AI responses to avoid duplicate expensive calls.
 * Key is built by the caller (e.g. hash of endpoint + normalized request body).
 */

interface CacheEntry<T = unknown> {
  value: T
  expiresAt: number
}

const store = new Map<string, CacheEntry>()
const MAX_ENTRIES = 500

function evictIfNeeded() {
  if (store.size <= MAX_ENTRIES) return
  const now = Date.now()
  const keysToDelete: string[] = []
  for (const [k, v] of store.entries()) {
    if (now >= v.expiresAt) keysToDelete.push(k)
  }
  keysToDelete.forEach((k) => store.delete(k))
  if (store.size > MAX_ENTRIES) {
    const sorted = [...store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)
    const toRemove = sorted.slice(0, store.size - MAX_ENTRIES)
    toRemove.forEach(([k]) => store.delete(k))
  }
}

/**
 * Get a cached response. Returns null if missing or expired.
 */
export function getCachedResponse<T = unknown>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() >= entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.value as T
}

/**
 * Store a response with TTL in ms.
 */
export function setCachedResponse<T = unknown>(key: string, value: T, ttlMs: number): void {
  evictIfNeeded()
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  })
}

/**
 * Build a stable cache key from endpoint and a normalized object (e.g. sorted JSON).
 */
export function buildCacheKey(endpoint: string, payload: Record<string, unknown>): string {
  try {
    const sorted = JSON.stringify(payload, Object.keys(payload).sort())
    return `ai:${endpoint}:${hashString(sorted)}`
  } catch {
    return `ai:${endpoint}:${Date.now()}`
  }
}

function hashString(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h = (h << 5) - h + c
    h |= 0
  }
  return Math.abs(h).toString(36)
}

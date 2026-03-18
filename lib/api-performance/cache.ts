/**
 * HTTP response cache for GET (and optionally other idempotent) endpoints.
 * In-memory by default; interface allows Redis or similar backend later.
 */

export type ApiCacheEntry = {
  body: unknown
  status: number
  headers: Record<string, string>
  cachedAt: number
  expiresAt: number
}

const memoryStore = new Map<string, ApiCacheEntry>()
const MAX_ENTRIES = 1000
const DEFAULT_TTL_MS = 60 * 1000 // 1 min

function evictIfNeeded() {
  if (memoryStore.size <= MAX_ENTRIES) return
  const now = Date.now()
  const toDelete: string[] = []
  for (const [k, v] of memoryStore.entries()) {
    if (now >= v.expiresAt) toDelete.push(k)
  }
  toDelete.forEach((k) => memoryStore.delete(k))
  if (memoryStore.size > MAX_ENTRIES) {
    const sorted = [...memoryStore.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt)
    sorted.slice(0, memoryStore.size - MAX_ENTRIES).forEach(([k]) => memoryStore.delete(k))
  }
}

/**
 * Build a stable cache key from method and URL (path + sorted search params).
 * Excludes params that bypass cache (e.g. refresh, _t).
 */
export function buildApiCacheKey(
  method: string,
  url: string,
  options?: { excludeParams?: string[] }
): string {
  const exclude = new Set(options?.excludeParams ?? ['refresh', '_t', 't'])
  try {
    const u = new URL(url, 'http://localhost')
    const parts: string[] = [method.toUpperCase(), u.pathname]
    const params: string[] = []
    u.searchParams.forEach((value, key) => {
      if (!exclude.has(key)) params.push(`${key}=${value}`)
    })
    params.sort()
    if (params.length) parts.push(params.join('&'))
    return `api:${parts.join(':')}`
  } catch {
    return `api:${method}:${url}`
  }
}

/**
 * Get cached response if present and not expired.
 */
export function getApiCached(key: string): ApiCacheEntry | null {
  const entry = memoryStore.get(key)
  if (!entry) return null
  if (Date.now() >= entry.expiresAt) {
    memoryStore.delete(key)
    return null
  }
  return entry
}

/**
 * Store response for key with TTL in ms.
 */
export function setApiCached(
  key: string,
  body: unknown,
  options?: { status?: number; headers?: Record<string, string>; ttlMs?: number }
): void {
  evictIfNeeded()
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS
  const now = Date.now()
  memoryStore.set(key, {
    body,
    status: options?.status ?? 200,
    headers: options?.headers ?? {},
    cachedAt: now,
    expiresAt: now + ttlMs,
  })
}

/**
 * TTL presets for common use cases.
 */
export const API_CACHE_TTL = {
  SHORT: 30 * 1000,       // 30s – frequently changing data
  DEFAULT: 60 * 1000,     // 1 min
  MEDIUM: 5 * 60 * 1000,  // 5 min – discovery, listings
  LONG: 15 * 60 * 1000,   // 15 min – static-ish config
} as const

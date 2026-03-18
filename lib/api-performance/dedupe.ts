/**
 * In-flight request deduplication: concurrent requests with the same key
 * share a single backend call and all receive the same result.
 */

const inFlight = new Map<string, Promise<unknown>>()

/**
 * Run fn once per key while in flight. Concurrent callers with the same key
 * get the same promise. Key should be a stable string (e.g. "draft:leagueId").
 */
export async function dedupeInFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined
  if (existing) return existing

  const promise = fn().finally(() => {
    inFlight.delete(key)
  })
  inFlight.set(key, promise)
  return promise
}

/**
 * Clear in-flight entry (e.g. after invalidation). Usually not needed.
 */
export function clearDedupeKey(key: string): void {
  inFlight.delete(key)
}

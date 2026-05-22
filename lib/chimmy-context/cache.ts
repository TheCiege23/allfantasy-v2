/**
 * Tiny TTL cache used by Chimmy context providers.
 * In-process only; safe for serverless because each cold start gets a fresh map.
 * Multi-instance Redis upgrade is a future phase concern (do not add here).
 */

type Entry<T> = {
  value: T
  expiresAt: number
}

export class TtlCache<T> {
  private store = new Map<string, Entry<T>>()
  private maxEntries: number

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries
  }

  get(key: string): T | undefined {
    const hit = this.store.get(key)
    if (!hit) return undefined
    if (hit.expiresAt <= Date.now()) {
      this.store.delete(key)
      return undefined
    }
    return hit.value
  }

  set(key: string, value: T, ttlMs: number): void {
    if (this.store.size >= this.maxEntries) {
      // Cheap eviction: drop the oldest insertion (Map preserves order).
      const oldest = this.store.keys().next().value
      if (oldest) this.store.delete(oldest)
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

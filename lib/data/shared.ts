import 'server-only'

export const DATA_TTLS = {
  players: 6 * 60 * 60 * 1000,
  injuries: 2 * 60 * 60 * 1000,
  schedules: 7 * 24 * 60 * 60 * 1000,
  adp: 7 * 24 * 60 * 60 * 1000,
  news: 30 * 60 * 1000,
} as const

const pendingRefreshes = new Map<string, Promise<unknown>>()

export function isFreshDate(value: Date | string | null | undefined, ttlMs: number): boolean {
  if (!value) return false
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return Date.now() - date.getTime() <= ttlMs
}

export function triggerBackgroundRefresh(key: string, refresh: () => Promise<unknown>): void {
  if (pendingRefreshes.has(key)) return

  const task = refresh()
    .catch((error) => {
      console.error('[data] background refresh failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      })
    })
    .finally(() => {
      pendingRefreshes.delete(key)
    })

  pendingRefreshes.set(key, task)
}

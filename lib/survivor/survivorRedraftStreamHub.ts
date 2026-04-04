/**
 * In-process pub/sub for `/api/redraft/stream/[seasonId]` so API routes can push Survivor + redraft events.
 *
 * Production: replace with Redis (or Vercel KV) pub/sub so elimination / phase events reach all nodes.
 * Until then, `survivor_elimination` only reaches clients on the same instance as the writer.
 */

type Listener = (payload: unknown) => void

const subs = new Map<string, Set<Listener>>()

export function subscribeSurvivorRedraftStream(seasonId: string, listener: Listener): () => void {
  const set = subs.get(seasonId) ?? new Set<Listener>()
  set.add(listener)
  subs.set(seasonId, set)
  return () => {
    const cur = subs.get(seasonId)
    if (!cur) return
    cur.delete(listener)
    if (cur.size === 0) subs.delete(seasonId)
  }
}

export function publishSurvivorRedraftEvent(seasonId: string, payload: unknown): void {
  const set = subs.get(seasonId)
  if (!set?.size) return
  for (const fn of set) {
    try {
      fn(payload)
    } catch {
      /* ignore subscriber errors */
    }
  }
}

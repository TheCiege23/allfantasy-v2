/**
 * In-process pub/sub for league-scoped SSE streams (same runtime as the Next.js server).
 * Survives across requests via globalThis.
 *
 * SWAP GUIDE (multi-instance / Redis / Supabase Realtime):
 *   1. Create a new class that implements `ILeagueRealtimeStore`.
 *   2. Replace the singleton assignment at the bottom of this file.
 *   3. No call-site changes are needed — all consumers depend only on the
 *      `ILeagueRealtimeStore` interface via the `leagueRealtimeStore` export.
 */

export type LeagueRealtimeEnvelope = {
  kind: 'league_event'
  leagueId: string
  eventType: string
  at: string
  message?: string
  meta?: Record<string, unknown>
}

/** Partial payload accepted by `publish` — `kind`, `leagueId`, and `at` are filled in by the store. */
export type LeagueRealtimePublishInput = Omit<LeagueRealtimeEnvelope, 'kind' | 'leagueId' | 'at'> & { at?: string }

type Listener = (payload: LeagueRealtimeEnvelope) => void

/**
 * Stable interface for the league realtime store.
 * Implement this interface to swap the backing transport (Redis, Supabase Realtime, etc.)
 * without touching any publisher or subscriber call sites.
 */
export interface ILeagueRealtimeStore {
  /**
   * Register a listener for events on a specific league.
   * Returns an unsubscribe function.
   */
  subscribe(leagueId: string, listener: Listener): () => void

  /**
   * Publish an event to all subscribers of a league.
   * `kind`, `leagueId`, and `at` are stamped by the store if not provided.
   */
  publish(leagueId: string, payload: LeagueRealtimePublishInput): void
}

// ---------------------------------------------------------------------------
// Default implementation: in-process (single server instance only)
// ---------------------------------------------------------------------------

class InProcessLeagueRealtimeStore implements ILeagueRealtimeStore {
  private subscribers = new Map<string, Set<Listener>>()

  subscribe(leagueId: string, listener: Listener): () => void {
    const set = this.subscribers.get(leagueId) ?? new Set<Listener>()
    set.add(listener)
    this.subscribers.set(leagueId, set)
    return () => {
      const cur = this.subscribers.get(leagueId)
      if (!cur) return
      cur.delete(listener)
      if (cur.size === 0) this.subscribers.delete(leagueId)
    }
  }

  publish(leagueId: string, payload: LeagueRealtimePublishInput): void {
    const env: LeagueRealtimeEnvelope = {
      kind: 'league_event',
      leagueId,
      at: payload.at ?? new Date().toISOString(),
      eventType: payload.eventType,
      message: payload.message,
      meta: payload.meta,
    }
    const set = this.subscribers.get(leagueId)
    if (!set?.size) return
    for (const fn of set) {
      try {
        fn(env)
      } catch {
        /* ignore subscriber errors */
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton — swap `InProcessLeagueRealtimeStore` for a Redis/Supabase adapter here.
// ---------------------------------------------------------------------------

const g = globalThis as typeof globalThis & { __afLeagueRealtimeStore?: ILeagueRealtimeStore }

export const leagueRealtimeStore: ILeagueRealtimeStore =
  g.__afLeagueRealtimeStore ?? (g.__afLeagueRealtimeStore = new InProcessLeagueRealtimeStore())

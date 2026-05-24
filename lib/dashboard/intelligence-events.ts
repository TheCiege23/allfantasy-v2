/**
 * Phase 3B.4 — Reactive intelligence event bus.
 *
 * Tiny `window` CustomEvent layer used by client code to ask the
 * `DashboardIntelligenceRail` to soft-refresh after writes that may move
 * intelligence (lineup saves, waiver claims, trades, matchup updates,
 * standings updates, league switches).
 *
 * Design rules:
 *  - Additive: anyone who doesn't import this keeps working.
 *  - SSR-safe: every helper is a no-op when `window` is undefined.
 *  - Scoped: events carry an optional `leagueId` so the rail can refresh
 *    only when the active league matches (or always, when `leagueId` is null).
 *  - Cheap: no React context, no global store. Just a typed CustomEvent.
 *  - Fail-safe: handlers are wrapped so a thrown listener never breaks
 *    the dispatcher's call site.
 */

export const INTELLIGENCE_INVALIDATE_EVENT = "af-intelligence-invalidate"

/**
 * Phase 4 — cross-tab BroadcastChannel name. Other tabs receive the same
 * invalidation and re-dispatch as a local CustomEvent (with `__crossTab: true`
 * to prevent rebroadcast loops). Graceful no-op when BroadcastChannel is
 * unavailable (old Safari, server, some extension contexts).
 */
export const INTELLIGENCE_BROADCAST_CHANNEL = "af-intelligence"

/** Reasons callers may emit. Free-form string so future call sites are not blocked. */
export type IntelligenceInvalidateReason =
  | "lineup_saved"
  | "waiver_claim"
  | "trade_update"
  | "matchup_update"
  | "standings_update"
  | "roster_change"
  | "injury_update"
  | "league_switch"
  | "manual"
  | (string & {})

export interface IntelligenceInvalidateDetail {
  /** League scope. `null` / omitted means "all leagues". */
  leagueId?: string | null
  /** Why the caller wants intelligence refreshed. Free-form for telemetry. */
  reason?: IntelligenceInvalidateReason
  /** Optional client timestamp for coalescing logic. */
  ts?: number
  /** @internal Set when re-dispatched from a BroadcastChannel message. */
  __crossTab?: boolean
}

/** @internal Lazily-initialized broadcast channel. `null` when unavailable. */
let broadcastChannel: BroadcastChannel | null = null
let broadcastChannelInit = false

function getBroadcastChannel(): BroadcastChannel | null {
  if (broadcastChannelInit) return broadcastChannel
  broadcastChannelInit = true
  if (typeof window === "undefined") return null
  if (typeof BroadcastChannel === "undefined") return null
  try {
    broadcastChannel = new BroadcastChannel(INTELLIGENCE_BROADCAST_CHANNEL)
    broadcastChannel.onmessage = (ev: MessageEvent<IntelligenceInvalidateDetail>) => {
      try {
        const detail = ev.data ?? {}
        // Re-dispatch as the same local CustomEvent so existing listeners
        // (e.g. DashboardIntelligenceRail) react without bespoke wiring.
        // Mark __crossTab so dispatchers won't rebroadcast and loop.
        window.dispatchEvent(
          new CustomEvent<IntelligenceInvalidateDetail>(INTELLIGENCE_INVALIDATE_EVENT, {
            detail: {
              leagueId: detail.leagueId ?? null,
              reason: detail.reason ?? "manual",
              ts: typeof detail.ts === "number" ? detail.ts : Date.now(),
              __crossTab: true,
            },
          })
        )
      } catch {
        /* ignore */
      }
    }
  } catch {
    broadcastChannel = null
  }
  return broadcastChannel
}

/** @internal Test-only: tear down the channel between tests. */
export function __resetIntelligenceBroadcastChannel(): void {
  try {
    broadcastChannel?.close()
  } catch {
    /* ignore */
  }
  broadcastChannel = null
  broadcastChannelInit = false
}

/**
 * Dispatch an invalidation event. Safe to call from any client surface.
 * Returns `true` when an event was dispatched, `false` otherwise (SSR, etc.).
 */
export function invalidateIntelligence(
  detail: IntelligenceInvalidateDetail = {}
): boolean {
  if (typeof window === "undefined") return false
  const normalized: IntelligenceInvalidateDetail = {
    leagueId: detail.leagueId ?? null,
    reason: detail.reason ?? "manual",
    ts: typeof detail.ts === "number" ? detail.ts : Date.now(),
  }
  try {
    window.dispatchEvent(
      new CustomEvent<IntelligenceInvalidateDetail>(INTELLIGENCE_INVALIDATE_EVENT, {
        detail: normalized,
      })
    )
  } catch {
    return false
  }
  // Best-effort cross-tab broadcast. Never rethrows; never blocks the
  // local dispatch above. Suppressed for events we ourselves received
  // from another tab (prevents rebroadcast loops).
  if (!detail.__crossTab) {
    try {
      getBroadcastChannel()?.postMessage(normalized)
    } catch {
      /* ignore */
    }
  }
  return true
}

/**
 * Subscribe to invalidation events. Returns an `unsubscribe` function.
 * Handler errors are swallowed so one bad listener cannot affect others.
 */
export function onIntelligenceInvalidate(
  handler: (detail: IntelligenceInvalidateDetail) => void
): () => void {
  if (typeof window === "undefined") return () => {}
  const listener = (ev: Event) => {
    try {
      const detail = (ev as CustomEvent<IntelligenceInvalidateDetail>).detail ?? {}
      handler({
        leagueId: detail.leagueId ?? null,
        reason: detail.reason ?? "manual",
        ts: typeof detail.ts === "number" ? detail.ts : Date.now(),
      })
    } catch {
      /* ignore */
    }
  }
  window.addEventListener(INTELLIGENCE_INVALIDATE_EVENT, listener)
  return () => window.removeEventListener(INTELLIGENCE_INVALIDATE_EVENT, listener)
}

/**
 * Pure helper used by the rail (and unit tests) to decide what to do
 * with an incoming invalidation event given the current scope.
 *
 *  - `refresh`  → soft-refresh the currently-displayed scope.
 *  - `evict`    → just drop the matching cache entry; no fetch.
 *  - `ignore`   → event is for a different scope and we have nothing to do.
 */
export type InvalidationDecision = "refresh" | "evict" | "ignore"

export function decideInvalidation(
  event: IntelligenceInvalidateDetail,
  currentLeagueId: string | null | undefined
): InvalidationDecision {
  const eventScope = event.leagueId ?? null
  const current = currentLeagueId ?? null
  // Global invalidation → always refresh the visible scope.
  if (eventScope === null) return "refresh"
  if (eventScope === current) return "refresh"
  return "evict"
}

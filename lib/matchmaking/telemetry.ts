/**
 * Phase 6F — Matchmaking telemetry contract.
 *
 * Lightweight event builders + an in-memory default recorder useful for
 * tests and edge wiring. Persistent storage is intentionally out of
 * scope for this phase — the app-level wiring layer will swap in a real
 * recorder that writes to Postgres / Mixpanel / etc.
 */

import type {
  DiscoveryRailKind,
  MatchmakingTelemetryEvent,
  MatchmakingTelemetryKind,
  MatchmakingTelemetryRecorder,
} from "./types"

function nowMs(): number {
  return Date.now()
}

export function buildTelemetryEvent(
  kind: MatchmakingTelemetryKind,
  actorId: string,
  opts: {
    leagueId?: string | null
    targetUserId?: string | null
    railKind?: DiscoveryRailKind | null
    fitScore?: number | null
    occurredAt?: number
  } = {}
): MatchmakingTelemetryEvent {
  return {
    kind,
    actorId,
    leagueId: opts.leagueId ?? null,
    targetUserId: opts.targetUserId ?? null,
    railKind: opts.railKind ?? null,
    fitScore:
      opts.fitScore == null || !Number.isFinite(opts.fitScore)
        ? null
        : Math.max(0, Math.min(1, opts.fitScore)),
    occurredAt: opts.occurredAt ?? nowMs(),
  }
}

/**
 * In-memory recorder — keeps the last N events. Useful for tests and
 * dev tooling. Not for production.
 */
export class InMemoryTelemetryRecorder implements MatchmakingTelemetryRecorder {
  private readonly events: MatchmakingTelemetryEvent[] = []
  constructor(private readonly capacity = 500) {}
  record(event: MatchmakingTelemetryEvent): void {
    this.events.push(event)
    if (this.events.length > this.capacity) {
      this.events.splice(0, this.events.length - this.capacity)
    }
  }
  list(): ReadonlyArray<MatchmakingTelemetryEvent> {
    return this.events.slice()
  }
  clear(): void {
    this.events.length = 0
  }
}

/** No-op recorder for production paths where telemetry is disabled. */
export const NULL_TELEMETRY_RECORDER: MatchmakingTelemetryRecorder = {
  record() {
    /* no-op */
  },
}

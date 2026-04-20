import 'server-only'

import { leagueRealtimeStore } from '@/lib/league-events/realtime-store'

/**
 * Lightweight realtime-only hint (no DB rows, no user notifications).
 * Use after roster/lineup saves, waiver tick, etc., so SSE clients refresh.
 */
export function publishLeagueRealtimeHint(
  leagueId: string,
  eventType: string,
  message?: string,
  meta?: Record<string, unknown>,
): void {
  leagueRealtimeStore.publish(leagueId, {
    eventType,
    message: message ?? '',
    meta: { ...(meta ?? {}), hintOnly: true },
  })
}

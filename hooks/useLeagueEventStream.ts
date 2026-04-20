'use client'

import { useEffect, useRef } from 'react'

import type { LeagueRealtimeEnvelope } from '@/lib/league-events/realtime-store'

/**
 * Subscribes to `GET /api/leagues/:leagueId/events/stream` (SSE) for same-origin realtime hints.
 * Falls back gracefully if the connection drops (caller can keep polling activity-feed).
 */
export function useLeagueEventStream(
  leagueId: string | undefined,
  onEnvelope: (env: LeagueRealtimeEnvelope) => void,
) {
  const cb = useRef(onEnvelope)
  cb.current = onEnvelope

  useEffect(() => {
    if (!leagueId || typeof window === 'undefined') return

    const url = `/api/leagues/${encodeURIComponent(leagueId)}/events/stream`
    const es = new EventSource(url)

    const onLeague = (e: MessageEvent) => {
      try {
        const raw = JSON.parse(e.data as string) as LeagueRealtimeEnvelope
        if (raw?.kind === 'league_event') cb.current(raw)
      } catch {
        /* ignore */
      }
    }

    es.addEventListener('league_event', onLeague as EventListener)

    es.onerror = () => {
      try {
        es.close()
      } catch {
        /* ignore */
      }
    }

    return () => {
      try {
        es.removeEventListener('league_event', onLeague as EventListener)
        es.close()
      } catch {
        /* ignore */
      }
    }
  }, [leagueId])
}

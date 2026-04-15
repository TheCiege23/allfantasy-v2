'use client'

import { useEffect, useRef } from 'react'

export type SurvivorMomentSse = {
  type: 'survivor_moment'
  id: string
  source: 'audit_entry' | 'audit_log'
  clipUrl: string
  clipType: 'video' | 'image'
  label?: string
  durationMs?: number
  category?: string
  action?: string
  eventType?: string
}

/**
 * SSE from `GET /api/leagues/[leagueId]/survivor/live` — moments with mapped clips only.
 */
export function useSurvivorLiveSse(
  leagueId: string | null,
  onEvent: (ev: SurvivorMomentSse) => void,
  enabled = true,
) {
  const onRef = useRef(onEvent)
  onRef.current = onEvent

  useEffect(() => {
    if (!leagueId || !enabled) return
    const since = new Date(Date.now() - 15_000).toISOString()
    const url = `/api/leagues/${encodeURIComponent(leagueId)}/survivor/live?since=${encodeURIComponent(since)}`
    const es = new EventSource(url)
    const seen = new Set<string>()
    es.onmessage = (e) => {
      try {
        const p = JSON.parse(e.data) as { type?: string; id?: string }
        if (p.type !== 'survivor_moment' || !p.id) return
        if (seen.has(p.id)) return
        seen.add(p.id)
        onRef.current(p as SurvivorMomentSse)
      } catch {
        /* ignore */
      }
    }
    es.onerror = () => {
      es.close()
    }
    return () => {
      es.close()
    }
  }, [leagueId, enabled])
}

'use client'

import { useEffect, useState } from 'react'

type StreamEvent = { type: string; [k: string]: unknown }

export function useRedraftStream(seasonId: string | null) {
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [scores, setScores] = useState<Record<string, unknown>>({})
  const [locks, setLocks] = useState<string[]>([])
  const [notifications, setNotifications] = useState<StreamEvent[]>([])

  useEffect(() => {
    if (!seasonId) return
    const es = new EventSource(`/api/redraft/stream/${encodeURIComponent(seasonId)}`)
    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data) as StreamEvent
        setEvents((prev) => [...prev.slice(-50), parsed])
        if (parsed.type === 'score_update' && parsed.matchupId) {
          setScores((s) => ({ ...s, [String(parsed.matchupId)]: parsed }))
        }
        if (parsed.type === 'player_locked' && parsed.playerId) {
          setLocks((l) => [...new Set([...l, String(parsed.playerId)])])
        }
        if (
          parsed.type === 'waiver_result' ||
          parsed.type === 'trade_update' ||
          parsed.type === 'recap_ready' ||
          parsed.type === 'keeper_submitted' ||
          parsed.type === 'keeper_locked' ||
          parsed.type === 'keeper_conflict' ||
          parsed.type === 'keeper_phase_opened' ||
          parsed.type === 'keeper_phase_closed'
        ) {
          setNotifications((n) => [...n.slice(-20), parsed])
        }
      } catch {
        /* ignore */
      }
    }
    es.onerror = () => {
      es.close()
    }
    return () => es.close()
  }, [seasonId])

  return { events, scores, locks, notifications }
}

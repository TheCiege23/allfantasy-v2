'use client'

import { useEffect, useState } from 'react'

type StreamEvent = { type: string; [k: string]: unknown }

export function useRedraftStream(seasonId: string | null) {
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [scores, setScores] = useState<Record<string, unknown>>({})
  const [locks, setLocks] = useState<string[]>([])
  const [notifications, setNotifications] = useState<StreamEvent[]>([])
  /** SSE payloads from `/api/redraft/stream` zombie animation poller (`zombie_event_animation`). */
  const [zombieAnimations, setZombieAnimations] = useState<StreamEvent[]>([])

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
        if (parsed.type === 'zombie_event_animation') {
          setZombieAnimations((prev) => [...prev.slice(-15), parsed])
        }
        if (
          parsed.type === 'waiver_result' ||
          parsed.type === 'trade_update' ||
          parsed.type === 'recap_ready' ||
          parsed.type === 'keeper_submitted' ||
          parsed.type === 'keeper_locked' ||
          parsed.type === 'keeper_conflict' ||
          parsed.type === 'keeper_phase_opened' ||
          parsed.type === 'keeper_phase_closed' ||
          parsed.type === 'guillotine_score_update' ||
          parsed.type === 'guillotine_elimination' ||
          parsed.type === 'guillotine_players_available' ||
          parsed.type === 'guillotine_final_stage' ||
          parsed.type === 'guillotine_champion' ||
          parsed.type === 'tribal_council_opened' ||
          parsed.type === 'vote_submitted' ||
          parsed.type === 'voting_locked' ||
          parsed.type === 'scroll_reveal_step' ||
          parsed.type === 'idol_played' ||
          parsed.type === 'player_eliminated' ||
          parsed.type === 'player_sent_to_exile' ||
          parsed.type === 'player_returned_from_exile' ||
          parsed.type === 'tribe_swap_executed' ||
          parsed.type === 'merge_announced' ||
          parsed.type === 'immunity_awarded' ||
          parsed.type === 'challenge_posted' ||
          parsed.type === 'challenge_locked' ||
          parsed.type === 'challenge_results' ||
          parsed.type === 'jury_phase_opened' ||
          parsed.type === 'finale_opened' ||
          parsed.type === 'winner_revealed' ||
          parsed.type === 'host_message' ||
          parsed.type === 'token_awarded' ||
          parsed.type === 'exile_boss_reset'
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

  return { events, scores, locks, notifications, zombieAnimations }
}

'use client'

import { useEffect, useState } from 'react'
import PlayerScoreRow from '@/components/matchups/PlayerScoreRow'

type Props = {
  leagueId: string
  rosterId: string
  season: number
  week: number
}

export default function TeamScoreBreakdown({ leagueId, rosterId, season, week }: Props) {
  const [rows, setRows] = useState<Array<{ playerId: string; points: number; isStarter: boolean }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await fetch(
        `/api/leagues/${leagueId}/scoring/breakdown?rosterId=${encodeURIComponent(rosterId)}&season=${season}&week=${week}`,
      )
      const data = await res.json().catch(() => ({}))
      if (cancelled) return
      setRows(Array.isArray(data.players) ? data.players : [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [leagueId, rosterId, season, week])

  if (loading) {
    return <p className="text-xs text-white/45">Loading lineup…</p>
  }
  if (rows.length === 0) {
    return <p className="text-xs text-white/45">No scoring rows yet — run weekly processing.</p>
  }

  return (
    <div className="space-y-1.5" data-testid="team-score-breakdown">
      {rows.map((r) => (
        <PlayerScoreRow key={r.playerId} playerId={r.playerId} points={r.points} isStarter={r.isStarter} />
      ))}
    </div>
  )
}

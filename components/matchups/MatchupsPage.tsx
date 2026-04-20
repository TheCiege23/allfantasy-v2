'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import MatchupCard from '@/components/matchups/MatchupCard'

type MatchupRow = {
  rosterId: string
  teamName: string
  totalPoints: number
  opponentRosterId: string | null
  opponentName: string | null
  winLoss: string | null
  status: string
}

function pairMatchups(rows: MatchupRow[]): Array<{ home: MatchupRow; away: MatchupRow }> {
  const seen = new Set<string>()
  const out: Array<{ home: MatchupRow; away: MatchupRow }> = []
  for (const r of rows) {
    if (seen.has(r.rosterId)) continue
    if (!r.opponentRosterId) continue
    const opp = rows.find((x) => x.rosterId === r.opponentRosterId)
    if (!opp) continue
    seen.add(r.rosterId)
    seen.add(opp.rosterId)
    const [home, away] = r.rosterId.localeCompare(opp.rosterId) < 0 ? [r, opp] : [opp, r]
    out.push({ home, away })
  }
  return out
}

export default function MatchupsPage({
  leagueId,
  initialSeason,
  initialWeek,
}: {
  leagueId: string
  initialSeason: number
  initialWeek: number
}) {
  const [season, setSeason] = useState(initialSeason)
  const [week, setWeek] = useState(initialWeek)
  const [rows, setRows] = useState<MatchupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/leagues/${leagueId}/scoring/matchups?season=${season}&week=${week}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Failed to load')
      setRows(Array.isArray(data.matchups) ? data.matchups : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [leagueId, season, week])

  useEffect(() => {
    void load()
  }, [load])

  const pairs = pairMatchups(rows)

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Matchups</h1>
          <p className="text-xs text-white/55">Head-to-head scores from the scoring engine</p>
        </div>
        <Link href={`/league/${leagueId}`} className="text-xs text-cyan-300 hover:text-cyan-200">
          ← League hub
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
        <label className="flex items-center gap-2 text-xs text-white/70">
          Season
          <input
            type="number"
            className="w-20 rounded border border-white/20 bg-black/40 px-2 py-1 text-white"
            value={season}
            onChange={(e) => setSeason(Number(e.target.value) || initialSeason)}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-white/70">
          Week
          <input
            type="number"
            className="w-16 rounded border border-white/20 bg-black/40 px-2 py-1 text-white"
            value={week}
            min={1}
            max={40}
            onChange={(e) => setWeek(Number(e.target.value) || 1)}
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs text-cyan-100"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-cyan-300">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}

      {!loading && pairs.length === 0 ? (
        <p className="text-center text-sm text-white/50">
          No matchups for this week yet. Ask your commissioner to run weekly scoring, or check another week.
        </p>
      ) : null}

      <div className="space-y-6">
        {pairs.map((p) => (
          <MatchupCard
            key={`${p.home.rosterId}-${p.away.rosterId}`}
            leagueId={leagueId}
            season={season}
            week={week}
            home={{
              rosterId: p.home.rosterId,
              teamName: p.home.teamName,
              totalPoints: p.home.totalPoints,
              winLoss: p.home.winLoss,
            }}
            away={{
              rosterId: p.away.rosterId,
              teamName: p.away.teamName,
              totalPoints: p.away.totalPoints,
              winLoss: p.away.winLoss,
            }}
            status={p.home.status}
          />
        ))}
      </div>
    </div>
  )
}

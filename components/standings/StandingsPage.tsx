'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import StandingsTable, { type StandingsRow } from '@/components/standings/StandingsTable'

export default function StandingsPage({
  leagueId,
  initialSeason,
}: {
  leagueId: string
  initialSeason: number
}) {
  const [season, setSeason] = useState(initialSeason)
  const [rows, setRows] = useState<StandingsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/leagues/${leagueId}/scoring/standings?season=${season}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Failed to load')
      const list = Array.isArray(data.standings) ? data.standings : []
      setRows(
        list.map(
          (r: {
            rosterId: string
            teamName: string
            wins: number
            losses: number
            ties: number
            pointsFor: number
            pointsAgainst: number
            rank: number | null
          }) => ({
            rosterId: r.rosterId,
            teamName: r.teamName,
            wins: r.wins,
            losses: r.losses,
            ties: r.ties,
            pointsFor: r.pointsFor,
            pointsAgainst: r.pointsAgainst,
            rank: r.rank,
          }),
        ),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [leagueId, season])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Standings</h1>
          <p className="text-xs text-white/55">Season totals from processed weekly results</p>
        </div>
        <Link href={`/league/${leagueId}/matchups`} className="text-xs text-cyan-300 hover:text-cyan-200">
          Matchups →
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

      {!loading && rows.length === 0 ? (
        <p className="text-center text-sm text-white/50">No standings yet — run weekly scoring processing.</p>
      ) : null}

      {rows.length > 0 ? <StandingsTable rows={rows} /> : null}
    </div>
  )
}

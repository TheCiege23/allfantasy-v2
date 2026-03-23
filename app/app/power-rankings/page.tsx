'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Award, Target } from 'lucide-react'
import type { PlatformPowerRow } from '@/lib/platform-power-rankings'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'

export default function PowerRankingsPage() {
  const [rows, setRows] = useState<PlatformPowerRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sport, setSport] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (sport) params.set('sport', sport)
    params.set('limit', '100')
    fetch(`/api/platform/power-rankings?${params.toString()}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load power rankings')
        return r.json()
      })
      .then((data) => {
        setRows(data.rows ?? [])
        setTotal(data.total ?? 0)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [sport])

  useEffect(() => {
    load()
  }, [load])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-400" />
          <h1 className="text-2xl font-semibold text-white">Platform Power Rankings</h1>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-white/70">Sport</label>
          <select
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
          >
            <option value="">All</option>
            {SUPPORTED_SPORTS.map((s) => (
              <option key={s} value={s}>
                {s === 'SOCCER' ? 'Soccer' : s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => load()}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
          >
            Refresh
          </button>
        </div>
      </div>
      <p className="mb-4 text-sm text-white/60">
        Cross-league ranking using legacy score, XP, championship history, and win percentage.
      </p>
      <div className="mb-4">
        <Link
          href="/app/legacy-score"
          className="text-xs text-amber-300 hover:underline"
        >
          Open full platform legacy leaderboard
        </Link>
      </div>

      {error && (
        <p className="mb-4 text-sm text-rose-400">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-white/50">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-3 font-medium text-white/80">Rank</th>
                <th className="p-3 font-medium text-white/80">Manager</th>
                <th className="p-3 font-medium text-white/80">Power</th>
                <th className="p-3 font-medium text-white/80">Legacy</th>
                <th className="p-3 font-medium text-white/80">XP</th>
                <th className="p-3 font-medium text-white/80">Championships</th>
                <th className="p-3 font-medium text-white/80">Win %</th>
                <th className="p-3 font-medium text-white/80">Leagues</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.managerId} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3">
                    <span className="font-medium text-amber-400">#{r.rank}</span>
                  </td>
                  <td className="p-3 font-mono text-white/90">{r.displayName ?? r.managerId}</td>
                  <td className="p-3">
                    <span className="flex items-center gap-1 text-cyan-300">
                      <Target className="h-3.5 w-3.5" />
                      {(r.powerScore * 100).toFixed(1)}
                    </span>
                  </td>
                  <td className="p-3 text-white/70">
                    {r.legacyScore != null ? r.legacyScore.toFixed(1) : '—'}
                  </td>
                  <td className="p-3 text-white/70">{r.totalXP}</td>
                  <td className="p-3">
                    <span className="flex items-center gap-1 text-amber-300">
                      <Award className="h-3.5 w-3.5" />
                      {r.championshipCount}
                    </span>
                  </td>
                  <td className="p-3 text-white/70">
                    {r.winPercentage != null ? `${r.winPercentage.toFixed(1)}%` : '—'}
                  </td>
                  <td className="p-3 text-white/60">{r.totalLeaguesPlayed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > 0 && (
        <p className="mt-3 text-xs text-white/50">Showing {rows.length} of {total} managers.</p>
      )}
    </main>
  )
}

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

/** Live meta snapshot for draft War Room: trending players + top strategies. */
export default function WarRoomMetaWidget(props: { sport?: string }) {
  const { sport = "NFL" } = props
  const [trending, setTrending] = useState<Array<{ playerId: string; trendScore: number; trendingDirection: string }>>([])
  const [strategies, setStrategies] = useState<Array<{ strategyType: string; usageRate: number; successRate: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    const params = new URLSearchParams({ sport, limit: "5" })
    Promise.all([
      fetch(`/api/player-trend?list=hottest&${params}`).then((r) => r.json()),
      fetch(`/api/strategy-meta?${params}`).then((r) => r.json()),
    ])
      .then(([trendRes, stratRes]) => {
        const err = trendRes.error || stratRes.error || null
        if (err) setError(err)
        else setError(null)
        setTrending((trendRes.data ?? []).slice(0, 5))
        setStrategies((stratRes.data ?? []).slice(0, 5))
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [sport])

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">War Room meta</h3>
        <p className="mt-2 text-xs text-slate-500">Loading…</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">War Room meta</h3>
        <p className="mt-2 text-xs text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">War Room meta</h3>
      <p className="mt-1 text-xs text-slate-500">Live insights for drafts</p>
      <div className="mt-3 space-y-3">
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Hottest (by trend)</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
            {trending.map((p) => (
              <li key={p.playerId}>
                {p.playerId} — {Math.round(p.trendScore)} ({p.trendingDirection})
              </li>
            ))}
            {trending.length === 0 && <li className="text-slate-500">No data</li>}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Top strategies</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
            {strategies.map((s) => (
              <li key={s.strategyType}>
                {s.strategyType}: {Math.round(s.usageRate * 100)}% usage, {Math.round(s.successRate * 100)}% success
              </li>
            ))}
            {strategies.length === 0 && <li className="text-slate-500">No data</li>}
          </ul>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        <Link href="/app/meta-insights" className="text-violet-600 hover:underline dark:text-violet-400">
          View full strategy meta
        </Link>
        {" · "}
        <Link href="/mock-draft-simulator" className="text-violet-600 hover:underline dark:text-violet-400">
          Mock draft
        </Link>
      </p>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"

export interface TrendingPlayer {
  playerId: string
  sport: string
  trendScore: number
  trendingDirection: string
  addRate: number
  dropRate: number
  tradeInterest: number
  draftFrequency: number
  lineupStartRate: number
  injuryImpact: number
  updatedAt: string
}

const DIRECTION_COLORS: Record<string, string> = {
  Hot: "text-amber-500",
  Rising: "text-emerald-500",
  Stable: "text-slate-500",
  Falling: "text-orange-500",
  Cold: "text-sky-500",
}

export default function PlayerTrendPanel(props: {
  sport?: string
  list?: "hottest" | "rising" | "fallers"
  limit?: number
  title?: string
}) {
  const { sport, list = "hottest", limit = 10, title } = props
  const [data, setData] = useState<TrendingPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams({ list, limit: String(limit) })
    if (sport) params.set("sport", sport)
    fetch(`/api/player-trend?${params}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error)
        else setData(res.data ?? [])
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [sport, list, limit])

  const label = title ?? (list === "hottest" ? "Hottest players" : list === "rising" ? "Fastest rising" : "Biggest fallers")

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</h3>
        <p className="mt-2 text-xs text-slate-500">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</h3>
        <p className="mt-2 text-xs text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</h3>
      <ul className="mt-2 space-y-1.5">
        {data.slice(0, limit).map((p) => (
          <li key={`${p.playerId}-${p.sport}`} className="flex items-center justify-between text-xs">
            <span className="truncate text-slate-600 dark:text-slate-400" title={p.playerId}>
              {p.playerId}
            </span>
            <span className="ml-2 font-mono tabular-nums text-slate-800 dark:text-slate-200">
              {Math.round(p.trendScore)}
            </span>
            <span className={`ml-2 ${DIRECTION_COLORS[p.trendingDirection] ?? "text-slate-500"}`}>
              {p.trendingDirection}
            </span>
          </li>
        ))}
      </ul>
      {data.length === 0 && <p className="mt-2 text-xs text-slate-500">No trend data yet.</p>}
    </div>
  )
}

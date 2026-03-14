"use client"

import { useEffect, useState } from "react"

export interface StrategyMetaRow {
  strategyType: string
  sport: string
  usageRate: number
  successRate: number
  trendingDirection: string
  leagueFormat: string
  sampleSize: number
}

export default function StrategyMetaPanel(props: {
  sport?: string
  leagueFormat?: string
  title?: string
}) {
  const { sport, leagueFormat, title = "Strategy meta" } = props
  const [data, setData] = useState<StrategyMetaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (sport) params.set("sport", sport)
    if (leagueFormat) params.set("leagueFormat", leagueFormat)
    fetch(`/api/strategy-meta?${params}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error)
        else setData(res.data ?? [])
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [sport, leagueFormat])

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</h3>
        <p className="mt-2 text-xs text-slate-500">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</h3>
        <p className="mt-2 text-xs text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-600 dark:text-slate-400">
              <th className="py-1 pr-2">Strategy</th>
              <th className="py-1 pr-2">Usage</th>
              <th className="py-1 pr-2">Success</th>
              <th className="py-1">Trend</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={`${r.strategyType}-${r.sport}-${r.leagueFormat}`} className="border-b border-slate-100 dark:border-slate-700">
                <td className="py-1 pr-2 font-medium text-slate-700 dark:text-slate-300">{r.strategyType}</td>
                <td className="py-1 pr-2 tabular-nums text-slate-600 dark:text-slate-400">
                  {Math.round(r.usageRate * 100)}%
                </td>
                <td className="py-1 pr-2 tabular-nums text-slate-600 dark:text-slate-400">
                  {Math.round(r.successRate * 100)}%
                </td>
                <td className="py-1 text-slate-500 dark:text-slate-400">{r.trendingDirection}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && <p className="mt-2 text-xs text-slate-500">No strategy reports yet. Run report generation to populate.</p>}
    </div>
  )
}

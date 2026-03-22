"use client"

import { useEffect, useState } from "react"
import type { MetaTabId } from "./MetaInsightsDashboard"

const META_TAB_TO_TYPE: Record<MetaTabId, string> = {
  draft: "DraftMeta",
  waiver: "WaiverMeta",
  trade: "TradeMeta",
  roster: "RosterMeta",
  strategy: "StrategyMeta",
}

export function MetaSnapshotPanel({
  sport,
  metaTab,
  timeframe,
  refreshKey,
}: {
  sport: string
  metaTab: MetaTabId
  timeframe: "24h" | "7d" | "30d"
  refreshKey: number
}) {
  const [snapshots, setSnapshots] = useState<Array<{ data: Record<string, unknown> }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const metaType = META_TAB_TO_TYPE[metaTab]

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ sport, metaType, timeframe })
    fetch(`/api/global-meta?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error)
        else setSnapshots(Array.isArray(res.data) ? res.data : [])
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [sport, metaType, timeframe, refreshKey])

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{metaType} snapshot</h3>
        <p className="mt-2 text-xs text-slate-500">Loading…</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{metaType} snapshot</h3>
        <p className="mt-2 text-xs text-red-500">{error}</p>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{metaType} snapshot</h3>
      {snapshots.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">No snapshot data yet. Run snapshot generation to populate.</p>
      ) : (
        <pre className="mt-2 max-h-32 overflow-auto text-xs text-slate-600 dark:text-slate-400">
          {JSON.stringify((snapshots[0] as { data?: Record<string, unknown> }).data ?? snapshots[0], null, 2)}
        </pre>
      )}
    </div>
  )
}

"use client"

import { useState, useCallback } from "react"
import PlayerTrendPanel from "./PlayerTrendPanel"
import StrategyMetaPanel from "./StrategyMetaPanel"
import WarRoomMetaWidget from "./WarRoomMetaWidget"
import { MetaTypeTabs } from "./MetaTypeTabs"
import { TimeframeFilter } from "./TimeframeFilter"
import { RefreshButton } from "./RefreshButton"
import { AIExplainTrendButton } from "./AIExplainTrendButton"
import { MetaSnapshotPanel } from "./MetaSnapshotPanel"

const SPORTS = ["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB", "SOCCER"] as const
const LEAGUE_FORMATS = [
  { value: "", label: "All formats" },
  { value: "dynasty_sf", label: "Dynasty SF" },
  { value: "dynasty_1qb", label: "Dynasty 1QB" },
  { value: "redraft_sf", label: "Redraft SF" },
  { value: "redraft_1qb", label: "Redraft 1QB" },
] as const
export type MetaTabId = "draft" | "waiver" | "trade" | "roster" | "strategy"
export type TimeframeId = "24h" | "7d" | "30d"

export default function MetaInsightsDashboard() {
  const [sport, setSport] = useState<string>("NFL")
  const [leagueFormat, setLeagueFormat] = useState<string>("")
  const [metaTab, setMetaTab] = useState<MetaTabId>("strategy")
  const [timeframe, setTimeframe] = useState<TimeframeId>("7d")
  const [refreshKey, setRefreshKey] = useState(0)
  const onRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Meta insights</h2>
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          aria-label="Sport filter"
        >
          {SPORTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={leagueFormat}
          onChange={(e) => setLeagueFormat(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          aria-label="League format (strategy)"
        >
          {LEAGUE_FORMATS.map((f) => (
            <option key={f.value || "all"} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <TimeframeFilter value={timeframe} onChange={setTimeframe} />
        <RefreshButton onRefresh={onRefresh} />
        <AIExplainTrendButton sport={sport} timeframe={timeframe} />
      </div>

      <MetaTypeTabs value={metaTab} onChange={setMetaTab} />

      <MetaSnapshotPanel sport={sport} metaTab={metaTab} refreshKey={refreshKey} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" key={refreshKey}>
        <PlayerTrendPanel sport={sport} list="hottest" limit={8} title="Trending players" />
        <PlayerTrendPanel sport={sport} list="rising" limit={6} title="Fastest rising" />
        <PlayerTrendPanel sport={sport} list="fallers" limit={6} title="Biggest fallers" />
      </div>

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        <StrategyMetaPanel
          sport={sport}
          leagueFormat={leagueFormat || undefined}
          title="Strategy popularity & success"
        />
        <WarRoomMetaWidget sport={sport} />
      </div>
    </div>
  )
}

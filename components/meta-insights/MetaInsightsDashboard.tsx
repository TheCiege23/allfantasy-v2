"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import PlayerTrendPanel from "./PlayerTrendPanel"
import StrategyMetaPanel from "./StrategyMetaPanel"
import WarRoomMetaWidget from "./WarRoomMetaWidget"
import { MetaTypeTabs } from "./MetaTypeTabs"
import { TimeframeFilter } from "./TimeframeFilter"
import { RefreshButton } from "./RefreshButton"
import { AIExplainTrendButton } from "./AIExplainTrendButton"
import { MetaSnapshotPanel } from "./MetaSnapshotPanel"
import { DEFAULT_SPORT, SUPPORTED_SPORTS, normalizeToSupportedSport } from "@/lib/sport-scope"

const LEAGUE_FORMATS = [
  { value: "", label: "All formats" },
  { value: "dynasty_sf", label: "Dynasty SF" },
  { value: "dynasty_1qb", label: "Dynasty 1QB" },
  { value: "redraft_sf", label: "Redraft SF" },
  { value: "redraft_1qb", label: "Redraft 1QB" },
] as const
export type MetaTabId = "draft" | "waiver" | "trade" | "roster" | "strategy"
export type TimeframeId = "24h" | "7d" | "30d"
const META_TAB_IDS: readonly MetaTabId[] = ["draft", "waiver", "trade", "roster", "strategy"] as const

function isMetaTabId(value: string | null): value is MetaTabId {
  return value != null && META_TAB_IDS.includes(value as MetaTabId)
}

export default function MetaInsightsDashboard() {
  const searchParams = useSearchParams()
  const [sport, setSport] = useState<string>(DEFAULT_SPORT)
  const [leagueFormat, setLeagueFormat] = useState<string>("")
  const [metaTab, setMetaTab] = useState<MetaTabId>("strategy")
  const [timeframe, setTimeframe] = useState<TimeframeId>("7d")
  const [refreshKey, setRefreshKey] = useState(0)
  const onRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    const sportParam = searchParams.get("sport")
    const leagueFormatParam = searchParams.get("leagueFormat")
    const timeframeParam = searchParams.get("timeframe")
    const tabParam = searchParams.get("tab")

    if (sportParam) {
      const normalized = normalizeToSupportedSport(sportParam)
      setSport((prev) => (prev === normalized ? prev : normalized))
    }
    if (leagueFormatParam != null) {
      setLeagueFormat((prev) => (prev === leagueFormatParam ? prev : leagueFormatParam))
    }
    if (timeframeParam === "24h" || timeframeParam === "7d" || timeframeParam === "30d") {
      setTimeframe((prev) => (prev === timeframeParam ? prev : timeframeParam))
    }
    if (isMetaTabId(tabParam)) {
      setMetaTab((prev) => (prev === tabParam ? prev : tabParam))
    }
  }, [searchParams])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Meta insights</h2>
        <select
          value={sport}
          onChange={(e) => setSport(normalizeToSupportedSport(e.target.value))}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          aria-label="Sport filter"
        >
          {SUPPORTED_SPORTS.map((s) => (
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

      <MetaSnapshotPanel sport={sport} metaTab={metaTab} timeframe={timeframe} refreshKey={refreshKey} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" key={refreshKey}>
        <PlayerTrendPanel sport={sport} timeframe={timeframe} list="hottest" limit={8} title="Trending players" refreshKey={refreshKey} />
        <PlayerTrendPanel sport={sport} timeframe={timeframe} list="rising" limit={6} title="Fastest rising" refreshKey={refreshKey} />
        <PlayerTrendPanel sport={sport} timeframe={timeframe} list="fallers" limit={6} title="Biggest fallers" refreshKey={refreshKey} />
      </div>

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        <StrategyMetaPanel
          sport={sport}
          leagueFormat={leagueFormat || undefined}
          timeframe={timeframe}
          title="Strategy popularity & success"
          refreshKey={refreshKey}
        />
        <WarRoomMetaWidget sport={sport} timeframe={timeframe} refreshKey={refreshKey} />
      </div>
    </div>
  )
}

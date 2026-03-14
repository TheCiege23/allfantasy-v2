"use client"

import { useState } from "react"
import PlayerTrendPanel from "./PlayerTrendPanel"
import StrategyMetaPanel from "./StrategyMetaPanel"
import WarRoomMetaWidget from "./WarRoomMetaWidget"

const SPORTS = ["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB"] as const

export default function MetaInsightsDashboard() {
  const [sport, setSport] = useState<string>("NFL")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Meta insights</h2>
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          {SPORTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PlayerTrendPanel sport={sport} list="hottest" limit={8} title="Trending players" />
        <PlayerTrendPanel sport={sport} list="rising" limit={6} title="Fastest rising" />
        <PlayerTrendPanel sport={sport} list="fallers" limit={6} title="Biggest fallers" />
      </div>

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        <StrategyMetaPanel sport={sport} title="Strategy popularity & success" />
        <WarRoomMetaWidget sport={sport} />
      </div>
    </div>
  )
}

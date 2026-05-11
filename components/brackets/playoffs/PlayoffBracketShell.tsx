"use client"

import { useMemo, useState, useTransition } from "react"
import { RefreshCw, Trophy } from "lucide-react"
import type { PlayoffChallengeView } from "@/lib/playoffs/types"
import { getPlayoffBracketViewClient, savePlayoffBracketPickClient } from "@/lib/playoffs/playoffClientApi"
import PlayoffBracketBoard from "./PlayoffBracketBoard"

type Props = {
  initialView: PlayoffChallengeView
}

export default function PlayoffBracketShell({ initialView }: Props) {
  const [view, setView] = useState(initialView)
  const [saving, startSaving] = useTransition()
  const [refreshing, startRefreshing] = useTransition()

  const pickCount = view.picks.length
  const totalSeries = view.series.length
  const title = useMemo(() => {
    const sportLabel = view.challenge.sport === "nba" ? "NBA" : "NHL"
    return `${sportLabel} Playoff Bracket`
  }, [view.challenge.sport])

  function handlePick(seriesId: string, teamName: string) {
    if (!view.activeEntry) return
    startSaving(async () => {
      const next = await savePlayoffBracketPickClient({
        challengeId: view.challenge.id,
        entryId: view.activeEntry!.id,
        seriesId,
        pickTeamName: teamName,
      })
      setView(next)
    })
  }

  function handleRefresh() {
    startRefreshing(async () => {
      const latest = await getPlayoffBracketViewClient(view.challenge.id)
      setView(latest)
    })
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
      <section className="rounded-3xl border border-slate-300 bg-[linear-gradient(130deg,#fff7ed_0%,#ecfeff_45%,#eef2ff_100%)] p-6 shadow-[0_20px_50px_rgba(30,41,59,0.15)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sleeper-style board</p>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-slate-700">{view.challenge.name} - {view.challenge.seasonYear}</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-400 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-white">
            <Trophy className="h-4 w-4" />
            {pickCount}/{totalSeries} picks
          </span>
          {saving ? <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">Saving pick...</span> : null}
          {view.challenge.isTestMode ? <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-900">Test mode</span> : null}
        </div>
      </section>

      <PlayoffBracketBoard rounds={view.rounds} series={view.series} picks={view.picks} onPick={handlePick} />
    </div>
  )
}

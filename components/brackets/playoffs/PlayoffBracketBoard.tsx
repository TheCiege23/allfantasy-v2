"use client"

import type { PlayoffPickView, PlayoffRoundKey, PlayoffSeriesView } from "@/lib/playoffs/types"

type Props = {
  rounds: PlayoffRoundKey[]
  series: PlayoffSeriesView[]
  picks: PlayoffPickView[]
  onPick?: (seriesId: string, teamName: string) => void
  locked?: boolean
}

const ROUND_LABELS: Record<PlayoffRoundKey, string> = {
  round_1: "Round 1",
  conference_semifinals: "Conference Semis",
  conference_finals: "Conference Finals",
  finals: "Finals",
}

function getPickForSeries(picks: PlayoffPickView[], seriesId: string): PlayoffPickView | null {
  return picks.find((pick) => pick.seriesId === seriesId) ?? null
}

export default function PlayoffBracketBoard({ rounds, series, picks, onPick, locked = false }: Props) {
  return (
    <div className="relative overflow-x-auto rounded-3xl border border-slate-300/80 bg-[linear-gradient(180deg,#fdfcf8_0%,#f4f7ff_100%)] p-4 shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(251,191,36,0.18),transparent_40%),radial-gradient(circle_at_90%_15%,rgba(14,165,233,0.2),transparent_35%)]" />
      <div className="relative grid min-w-[980px] grid-cols-4 gap-4">
        {rounds.map((roundKey) => {
          const roundSeries = series.filter((item) => item.round === roundKey)
          return (
            <section key={roundKey} className="rounded-2xl border border-slate-300/70 bg-white/80 p-3 backdrop-blur-sm">
              <header className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="font-semibold tracking-wide text-slate-800">{ROUND_LABELS[roundKey]}</h3>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                  {roundSeries.length} series
                </span>
              </header>
              <div className="space-y-3">
                {roundSeries.map((item) => {
                  const pick = getPickForSeries(picks, item.id)
                  return (
                    <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span>S{item.seriesNumber}</span>
                        <span>{item.bestOf === 7 ? "Best of 7" : `Best of ${item.bestOf}`}</span>
                      </div>
                      <div className="space-y-2">
                        {[item.homeTeamName, item.awayTeamName].map((teamName) => {
                          const selected = pick?.pickTeamName === teamName
                          return (
                            <button
                              key={`${item.id}:${teamName}`}
                              type="button"
                              disabled={locked}
                              onClick={() => onPick?.(item.id, teamName)}
                              className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
                                selected
                                  ? "border-amber-500 bg-amber-100 text-amber-900"
                                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-400 hover:bg-sky-50"
                              } ${locked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                            >
                              {teamName}
                            </button>
                          )
                        })}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {item.conference === "finals" ? "Cup Finals" : `${item.conference.toUpperCase()} Conference`}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import { Fragment } from "react"
import type { MatchupSummary } from "./MatchupCard"

type MatchupDetailViewProps = {
  matchup: MatchupSummary | null
}

type PlayerLine = {
  id: string
  name: string
  team: string
  position: string
  points: number
  status: string
}

const MOCK_PLAYERS: PlayerLine[] = [
  { id: "1", name: "Patrick Mahomes", team: "KC", position: "QB", points: 26.4, status: "Final" },
  { id: "2", name: "Christian McCaffrey", team: "SF", position: "RB", points: 21.3, status: "Q4 03:12" },
  { id: "3", name: "Garrett Wilson", team: "NYJ", position: "WR", points: 14.7, status: "Sun 4:25" },
]

export function MatchupDetailView({ matchup }: MatchupDetailViewProps) {
  if (!matchup) {
    return (
      <section className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/60">
        Select a matchup to see full lineups and live scoring details.
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/80">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div>
          <p className="text-sm font-semibold text-white">
            {matchup.teamA} <span className="text-white/45">vs</span> {matchup.teamB}
          </p>
          <p className="mt-0.5 text-[11px] text-white/65">
            {matchup.scoreA.toFixed(1)} – {matchup.scoreB.toFixed(1)} now •{" "}
            {matchup.projA.toFixed(1)} – {matchup.projB.toFixed(1)} projected
          </p>
        </div>
        <div className="text-right text-[11px]">
          <p className="text-white/60">Win prob</p>
          <p className="font-semibold text-emerald-300">
            {(matchup.winProbA * 100).toFixed(0)}% {matchup.teamA}
          </p>
          <p className="mt-0.5 text-white/55">
            Remaining: {matchup.remainingA} vs {matchup.remainingB}
          </p>
        </div>
      </header>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <LineupColumn title="Starting Lineup" teamLabel={matchup.teamA} />
        <LineupColumn title="Starting Lineup" teamLabel={matchup.teamB} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <LineupColumn title="Bench" teamLabel={matchup.teamA} subtle />
        <LineupColumn title="Bench" teamLabel={matchup.teamB} subtle />
      </div>
    </section>
  )
}

function LineupColumn({
  title,
  teamLabel,
  subtle,
}: {
  title: string
  teamLabel: string
  subtle?: boolean
}) {
  return (
    <div
      className={`rounded-xl border px-2.5 py-2 ${
        subtle ? "border-white/10 bg-black/40" : "border-white/15 bg-black/50"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-white/70">
        <span className="font-semibold">{title}</span>
        <span className="truncate text-white/50">{teamLabel}</span>
      </div>
      <div className="space-y-1.5">
        {MOCK_PLAYERS.map((p) => (
          <Fragment key={`${teamLabel}-${title}-${p.id}`}>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/12 bg-black/40 px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold">
                  {p.position}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-white">{p.name}</p>
                  <p className="text-[10px] text-white/60">{p.team}</p>
                </div>
              </div>
              <div className="text-right text-[10px]">
                <p className="text-white/55">Pts</p>
                <p className="font-semibold text-emerald-200">{p.points.toFixed(1)}</p>
                <p className="mt-0.5 text-white/50">{p.status}</p>
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}


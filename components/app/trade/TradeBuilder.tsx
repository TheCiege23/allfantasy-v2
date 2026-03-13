"use client"

import { useState } from "react"
import { ArrowLeftRight, Scale, Users } from "lucide-react"
import { useTradeBuilder } from "./useTradeBuilder"

type TradeBuilderProps = {
  leagueId?: string
}

export function TradeBuilder({ leagueId }: TradeBuilderProps) {
  const { proposal, setPartner, togglePlayer, togglePick, submitProposal, saving, error } =
    useTradeBuilder({ leagueId })
  const [selectedPartner, setSelectedPartner] = useState<string>("u2")

  const mockPartners = [
    { userId: "u2", teamName: "Rival GM" },
    { userId: "u3", teamName: "Rebuild Squad" },
  ]

  const mockRoster = [
    { id: "p1", name: "Garrett Wilson", team: "NYJ", position: "WR", value: 82 },
    { id: "p2", name: "Drake London", team: "ATL", position: "WR", value: 76 },
    { id: "p3", name: "Rachaad White", team: "TB", position: "RB", value: 71 },
  ]
  const mockPartnerRoster = [
    { id: "p4", name: "Brandon Aiyuk", team: "SF", position: "WR", value: 84 },
    { id: "p5", name: "Travis Etienne", team: "JAX", position: "RB", value: 80 },
    { id: "p6", name: "George Pickens", team: "PIT", position: "WR", value: 70 },
  ]

  const mockPicks = [
    { id: "2025-1", label: "2025 1st", value: 90 },
    { id: "2025-2", label: "2025 2nd", value: 70 },
    { id: "2026-1", label: "2026 1st", value: 80 },
  ]

  const totalValueFrom =
    sumValues(mockRoster, proposal.from.players) + sumPicks(mockPicks, proposal.from.picks)
  const totalValueTo =
    sumValues(mockPartnerRoster, proposal.to.players) + sumPicks(mockPicks, proposal.to.picks)

  const fairnessDelta = totalValueFrom - totalValueTo
  const fairnessScore = 50 + Math.max(-25, Math.min(25, fairnessDelta / 4))

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/80">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/50 bg-black/60">
            <ArrowLeftRight className="h-3.5 w-3.5 text-cyan-300" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Trade Center</p>
            <p className="text-[10px] text-white/65">
              Build and review offers. AI fairness and coaching wire in next steps.
            </p>
          </div>
        </div>
      </header>

      <div className="rounded-xl border border-white/12 bg-black/40 p-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] text-white/70">Trade partner</span>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-white/60" />
            <select
              value={selectedPartner}
              onChange={(e) => {
                const id = e.target.value
                setSelectedPartner(id)
                const p = mockPartners.find((m) => m.userId === id)
                if (p) setPartner(p.userId, p.teamName)
              }}
              className="rounded-lg border border-white/20 bg-black/60 px-2 py-1 text-[11px] outline-none"
            >
              {mockPartners.map((p) => (
                <option key={p.userId} value={p.userId}>
                  {p.teamName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <RosterSide
            label="Your roster"
            roster={mockRoster}
            picks={mockPicks}
            selectedPlayers={proposal.from.players}
            selectedPicks={proposal.from.picks}
            onTogglePlayer={(id) => togglePlayer("from", id)}
            onTogglePick={(id) => togglePick("from", id)}
          />
          <RosterSide
            label={proposal.to.teamName || "Partner roster"}
            roster={mockPartnerRoster}
            picks={mockPicks}
            selectedPlayers={proposal.to.players}
            selectedPicks={proposal.to.picks}
            onTogglePlayer={(id) => togglePlayer("to", id)}
            onTogglePick={(id) => togglePick("to", id)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/12 bg-black/40 p-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-white/70">
          <span className="font-semibold">Trade summary</span>
          <span className="text-white/60">
            Value: you {totalValueFrom.toFixed(0)} • them {totalValueTo.toFixed(0)}
          </span>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-1.5 text-[11px] text-white/80">
            <p className="text-white/65">You send:</p>
            <SummaryList
              players={mockRoster}
              picks={mockPicks}
              selectedPlayers={proposal.from.players}
              selectedPicks={proposal.from.picks}
            />
            <p className="mt-1 text-white/65">You receive:</p>
            <SummaryList
              players={mockPartnerRoster}
              picks={mockPicks}
              selectedPlayers={proposal.to.players}
              selectedPicks={proposal.to.picks}
            />
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-white/12 bg-black/50 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2 text-[11px] text-white/70">
              <div className="flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-emerald-300" />
                <span>Fairness meter (placeholder)</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-300">
                {fairnessScore.toFixed(0)}/100
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-white/10">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400"
                style={{ width: `${Math.max(4, Math.min(96, fairnessScore))}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-white/60">
              Positive scores lean in your favor; negative scores lean toward your partner. AI coach will refine this
              later.
            </p>
            <button
              type="button"
              onClick={() => void submitProposal()}
              disabled={saving}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-cyan-400 px-3 py-1.5 text-[11px] font-semibold text-black shadow-sm hover:bg-cyan-300 disabled:opacity-50"
            >
              {saving ? "Submitting..." : "Submit trade offer"}
            </button>
            {error && (
              <p className="mt-1 text-[10px] text-red-300">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function sumValues(roster: { id: string; value: number }[], ids: string[]) {
  return roster
    .filter((p) => ids.includes(p.id))
    .reduce((sum, p) => sum + (p.value || 0), 0)
}

function sumPicks(picks: { id: string; value: number }[], ids: string[]) {
  return picks
    .filter((p) => ids.includes(p.id))
    .reduce((sum, p) => sum + (p.value || 0), 0)
}

type RosterSideProps = {
  label: string
  roster: { id: string; name: string; team: string; position: string; value: number }[]
  picks: { id: string; label: string; value: number }[]
  selectedPlayers: string[]
  selectedPicks: string[]
  onTogglePlayer: (id: string) => void
  onTogglePick: (id: string) => void
}

function RosterSide({
  label,
  roster,
  picks,
  selectedPlayers,
  selectedPicks,
  onTogglePlayer,
  onTogglePick,
}: RosterSideProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-white/70">{label}</p>
      <div className="space-y-1">
        {roster.map((p) => {
          const selected = selectedPlayers.includes(p.id)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onTogglePlayer(p.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left text-[11px] ${
                selected
                  ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-50"
                  : "border-white/12 bg-black/50 text-white/80 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold">
                  {p.position}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-[10px] text-white/60">{p.team}</p>
                </div>
              </div>
              <span className="text-[10px] text-emerald-200">Val {p.value}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-1 space-y-1">
        <p className="text-[11px] text-white/65">Picks</p>
        {picks.map((pick) => {
          const selected = selectedPicks.includes(pick.id)
          return (
            <button
              key={pick.id}
              type="button"
              onClick={() => onTogglePick(pick.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1 text-left text-[11px] ${
                selected
                  ? "border-indigo-400/60 bg-indigo-500/10 text-indigo-50"
                  : "border-white/12 bg-black/40 text-white/80 hover:bg-white/5"
              }`}
            >
              <span>{pick.label}</span>
              <span className="text-[10px] text-indigo-200">Val {pick.value}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

type SummaryListProps = {
  players: { id: string; name: string; team: string; position: string }[]
  picks: { id: string; label: string }[]
  selectedPlayers: string[]
  selectedPicks: string[]
}

function SummaryList({ players, picks, selectedPlayers, selectedPicks }: SummaryListProps) {
  const anyPlayers = selectedPlayers.length > 0
  const anyPicks = selectedPicks.length > 0

  if (!anyPlayers && !anyPicks) {
    return <p className="text-[10px] text-white/55">Nothing selected.</p>
  }

  return (
    <ul className="space-y-0.5 text-[10px] text-white/80">
      {players
        .filter((p) => selectedPlayers.includes(p.id))
        .map((p) => (
          <li key={p.id}>
            {p.position} {p.name} ({p.team})
          </li>
        ))}
      {picks
        .filter((p) => selectedPicks.includes(p.id))
        .map((p) => (
          <li key={p.id}>
            Pick {p.label}
          </li>
        ))}
    </ul>
  )
}


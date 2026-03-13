"use client"

import { useState } from "react"
import { ChevronsDown, ChevronsUp, Users, Activity } from "lucide-react"
import { useRosterManager, type RosterPlayer, type RosterSectionKey } from "./useRosterManager"

type RosterBoardProps = {
  leagueId?: string
}

type DragState = {
  playerId: string
  fromSlot: RosterSectionKey
} | null

export default function RosterBoard({ leagueId }: RosterBoardProps) {
  const { roster, saving, saveError, lastSavedAt, movePlayer, swapPlayers, dropPlayer } = useRosterManager({
    leagueId,
  })
  const [drag, setDrag] = useState<DragState>(null)

  const sections: { key: RosterSectionKey; label: string }[] = [
    { key: "starters", label: "Starters" },
    { key: "bench", label: "Bench" },
    { key: "ir", label: "IR" },
    { key: "taxi", label: "Taxi" },
    { key: "devy", label: "Devy" },
  ]

  if (!roster) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/70">
        Loading roster...
      </div>
    )
  }

  const handleDropOnSection = (slot: RosterSectionKey) => {
    if (!drag) return
    movePlayer(drag.playerId, slot)
    setDrag(null)
  }

  const handleDropOnPlayer = (targetId: string) => {
    if (!drag) return
    swapPlayers(drag.playerId, targetId)
    setDrag(null)
  }

  const optimizeLineup = () => {
    // Placeholder optimizer: move highest projection players into starters.
    const all: RosterPlayer[] = [
      ...roster.starters,
      ...roster.bench,
      ...roster.ir,
      ...roster.taxi,
      ...roster.devy,
    ]

    const sorted = [...all].sort((a, b) => b.projection - a.projection)
    const startersTarget = 9 // simple default
    const optimizedStarters = sorted.slice(0, startersTarget)
    const remaining = sorted.slice(startersTarget)

    optimizedStarters.forEach((p) => movePlayer(p.id, "starters"))
    remaining.forEach((p) => {
      if (p.status === "ir") movePlayer(p.id, "ir")
      else movePlayer(p.id, "bench")
    })
  }

  return (
    <section className="space-y-3 text-xs">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-400/60 bg-black/50">
            <Users className="h-4 w-4 text-emerald-300" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Roster</p>
            <p className="text-[10px] text-white/65">
              Drag and drop to manage starters, bench, IR, taxi, and devy slots.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={optimizeLineup}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-3 py-1.5 text-[11px] font-semibold text-black shadow-sm hover:bg-emerald-300"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Optimize lineup</span>
          </button>
          {saving && <span className="text-[10px] text-white/60">Saving…</span>}
          {!saving && !saveError && lastSavedAt && (
            <span className="text-[10px] text-emerald-300">
              Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {saveError && (
            <span className="text-[10px] text-red-300">{saveError}</span>
          )}
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-2">
          {sections
            .filter((s) => s.key === "starters" || s.key === "bench")
            .map((section) => (
              <RosterSection
                key={section.key}
                label={section.label}
                slot={section.key}
                players={roster[section.key]}
                drag={drag}
                setDrag={setDrag}
                onDropSection={handleDropOnSection}
                onDropPlayer={handleDropOnPlayer}
                onDrop={dropPlayer}
              />
            ))}
        </div>
        <div className="space-y-2">
          {sections
            .filter((s) => s.key !== "starters" && s.key !== "bench")
            .map((section) => (
              <RosterSection
                key={section.key}
                label={section.label}
                slot={section.key}
                players={roster[section.key]}
                drag={drag}
                setDrag={setDrag}
                onDropSection={handleDropOnSection}
                onDropPlayer={handleDropOnPlayer}
                onDrop={dropPlayer}
              />
            ))}
        </div>
      </div>
    </section>
  )
}

type RosterSectionProps = {
  label: string
  slot: RosterSectionKey
  players: RosterPlayer[]
  drag: DragState
  setDrag: (s: DragState) => void
  onDropSection: (slot: RosterSectionKey) => void
  onDropPlayer: (id: string) => void
  onDrop: (id: string) => void
}

function RosterSection({
  label,
  slot,
  players,
  drag,
  setDrag,
  onDropSection,
  onDropPlayer,
  onDrop,
}: RosterSectionProps) {
  const isEmpty = players.length === 0

  return (
    <div
      className="rounded-2xl border border-white/12 bg-black/40 p-2"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        if (drag) onDropSection(slot)
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-white/70">
        <span className="font-semibold">{label}</span>
        <span className="text-white/40">{players.length}</span>
      </div>
      <div className="space-y-1.5">
        {isEmpty ? (
          <div className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-center text-[11px] text-white/35">
            Drag players here to assign to {label.toLowerCase()}.
          </div>
        ) : (
          players.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              isDragging={drag?.playerId === p.id}
              onDragStart={() => setDrag({ playerId: p.id, fromSlot: slot })}
              onDropOn={() => onDropPlayer(p.id)}
              onDropSelf={() => onDrop(p.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

type PlayerCardProps = {
  player: RosterPlayer
  isDragging: boolean
  onDragStart: () => void
  onDropOn: () => void
  onDropSelf: () => void
}

function PlayerCard({ player, isDragging, onDragStart, onDropOn, onDropSelf }: PlayerCardProps) {
  const statusColor =
    player.status === "healthy"
      ? "bg-emerald-400"
      : player.status === "q"
      ? "bg-amber-400"
      : player.status === "out"
      ? "bg-red-500"
      : "bg-purple-400"

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        onDragStart()
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onDropOn()
      }}
      onClick={() => {
        // placeholder: open player profile modal / route
      }}
      onTouchStart={() => {
        // placeholder: long-press detection for mobile can be wired here
      }}
      className={`group flex items-center justify-between gap-2 rounded-xl border border-white/14 bg-black/60 px-2.5 py-2 text-xs transition-transform transition-shadow ${
        isDragging ? "opacity-60 ring-2 ring-emerald-400/60" : "hover:-translate-y-0.5 hover:shadow-lg"
      }`}
    >
      <div className="flex flex-1 items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold text-white">
          {player.position}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <p className="truncate text-[11px] font-semibold text-white">{player.name}</p>
            <span className="text-[10px] text-white/60">{player.team}</span>
          </div>
          <p className="text-[10px] text-white/55">
            {player.opponent} • {player.gameTime}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 text-right">
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-white/50">Proj</span>
          <span className="font-semibold text-emerald-300">{player.projection.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-white/45">Actual</span>
          <span className="font-semibold text-cyan-200">
            {player.actual != null ? player.actual.toFixed(1) : "-"}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${statusColor}`}
          title={player.status.toUpperCase()}
        >
          <span className="text-[9px] font-bold text-black">
            {player.status === "healthy" ? "H" : player.status.toUpperCase()}
          </span>
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDropSelf()
          }}
          className="inline-flex items-center justify-center rounded-full border border-white/15 px-1 py-0.5 text-[9px] text-white/75 hover:bg-white/10"
        >
          <ChevronsDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}


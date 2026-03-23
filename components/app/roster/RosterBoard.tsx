"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronsDown, Users, Activity } from "lucide-react"
import { useRosterManager, type RosterPlayer, type RosterSectionKey } from "./useRosterManager"
import { teamLogoUrl } from "@/lib/media-url"
import PlayerCardAnalytics from "@/components/player-card/PlayerCardAnalytics"

type RosterBoardProps = {
  leagueId?: string
}

type DragState = {
  playerId: string
  fromSlot: RosterSectionKey
} | null

const SECTION_DEFINITIONS: { key: RosterSectionKey; label: string }[] = [
  { key: "starters", label: "Starters" },
  { key: "bench", label: "Bench" },
  { key: "ir", label: "IR" },
  { key: "taxi", label: "Taxi" },
  { key: "devy", label: "Devy" },
]

const EMPTY_ROSTER = {
  starters: [],
  bench: [],
  ir: [],
  taxi: [],
  devy: [],
} as const

export default function RosterBoard({ leagueId }: RosterBoardProps) {
  const {
    roster,
    leagueSport,
    saving,
    saveError,
    lastSavedAt,
    slotLimits,
    availablePlayers,
    poolLoading,
    movePlayer,
    swapPlayers,
    dropPlayer,
    addPlayerFromPool,
    optimizeLineup,
  } = useRosterManager({
    leagueId,
  })
  const [drag, setDrag] = useState<DragState>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<RosterPlayer | null>(null)
  const [poolSearch, setPoolSearch] = useState("")
  const [poolSlot, setPoolSlot] = useState<RosterSectionKey>("bench")
  const [poolPlayerId, setPoolPlayerId] = useState("")
  const rosterState = roster ?? EMPTY_ROSTER

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

  const filteredPool = availablePlayers
    .filter((p) => {
      if (!poolSearch.trim()) return true
      const q = poolSearch.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        (p.position ?? "").toLowerCase().includes(q) ||
        (p.team ?? "").toLowerCase().includes(q)
      )
    })
    .slice(0, 100)

  const visibleSections = useMemo(
    () =>
      SECTION_DEFINITIONS.filter((section) => {
        const limit = Number(slotLimits[section.key] ?? 0)
        return limit > 0 || rosterState[section.key].length > 0
      }),
    [slotLimits, rosterState]
  )
  const addTargetSections = useMemo(
    () => visibleSections.filter((section) => Number(slotLimits[section.key] ?? 0) > 0),
    [visibleSections, slotLimits]
  )
  const resolvedPoolSlot = addTargetSections.some((s) => s.key === poolSlot)
    ? poolSlot
    : (addTargetSections[0]?.key ?? "bench")

  useEffect(() => {
    if (poolSlot !== resolvedPoolSlot) {
      setPoolSlot(resolvedPoolSlot)
    }
  }, [poolSlot, resolvedPoolSlot])

  if (!roster) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/70">
        Loading roster...
      </div>
    )
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
          <div className="rounded-2xl border border-white/12 bg-black/40 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-white/85">Add from player pool</p>
              <span className="text-[10px] text-white/45">
                {poolLoading ? "Loading…" : `${availablePlayers.length} available`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={poolSearch}
                onChange={(e) => setPoolSearch(e.target.value)}
                placeholder="Search free agents"
                aria-label="Search available players"
                className="flex-1 min-w-[180px] rounded-lg border border-white/15 bg-black/50 px-2.5 py-1.5 text-[11px] text-white placeholder:text-white/40"
              />
              <select
                aria-label="Choose roster section for add"
                value={resolvedPoolSlot}
                onChange={(e) => setPoolSlot(e.target.value as RosterSectionKey)}
                className="rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 text-[11px] text-white"
              >
                {addTargetSections.map((section) => (
                  <option key={section.key} value={section.key}>
                    {section.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Available player list"
                value={poolPlayerId}
                onChange={(e) => setPoolPlayerId(e.target.value)}
                className="flex-1 min-w-[220px] rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 text-[11px] text-white"
              >
                <option value="">Select player</option>
                {filteredPool.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.position ? `(${p.position})` : ""} {p.team ? `- ${p.team}` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-testid="roster-add-player-button"
                disabled={!poolPlayerId}
                onClick={() => {
                  if (!poolPlayerId) return
                  addPlayerFromPool(poolPlayerId, resolvedPoolSlot)
                  setPoolPlayerId("")
                }}
                className="rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-3 py-1.5 text-[11px] text-emerald-200 disabled:opacity-50"
              >
                Add player
              </button>
            </div>
          </div>
          {visibleSections
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
                onMovePlayer={movePlayer}
                onDrop={dropPlayer}
                sectionLimit={slotLimits[section.key]}
                onPlayerSelect={setSelectedPlayer}
                leagueSport={leagueSport}
                moveToBenchEnabled={Number(slotLimits.bench ?? 0) > 0}
                moveToIrEnabled={Number(slotLimits.ir ?? 0) > 0}
              />
            ))}
        </div>
        <div className="space-y-2">
          {visibleSections
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
                onMovePlayer={movePlayer}
                onDrop={dropPlayer}
                sectionLimit={slotLimits[section.key]}
                onPlayerSelect={setSelectedPlayer}
                leagueSport={leagueSport}
                moveToBenchEnabled={Number(slotLimits.bench ?? 0) > 0}
                moveToIrEnabled={Number(slotLimits.ir ?? 0) > 0}
              />
            ))}
        </div>
      </div>
      {selectedPlayer && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-label="Roster player details"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#111219] p-4 text-white">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{selectedPlayer.name}</p>
                <p className="text-[11px] text-white/60">
                  {selectedPlayer.position} · {selectedPlayer.team}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className="rounded border border-white/20 px-2 py-1 text-[10px] text-white/75 hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <dl className="space-y-1 text-[11px] text-white/75">
              <div className="flex justify-between gap-2">
                <dt>Section</dt>
                <dd className="text-white/90">{selectedPlayer.slot}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Status</dt>
                <dd className="text-white/90">{selectedPlayer.status.toUpperCase()}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Projection</dt>
                <dd className="text-white/90">{selectedPlayer.projection.toFixed(1)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Game</dt>
                <dd className="text-white/90">{selectedPlayer.opponent}</dd>
              </div>
            </dl>
            <div className="mt-3">
              <PlayerCardAnalytics
                playerId={selectedPlayer.id}
                playerName={selectedPlayer.name}
                position={selectedPlayer.position}
                team={selectedPlayer.team}
                sport={leagueSport}
                eager={false}
              />
            </div>
          </div>
        </div>
      )}
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
  onMovePlayer: (id: string, toSlot: RosterSectionKey) => void
  onDrop: (id: string) => void
  sectionLimit?: number
  onPlayerSelect: (player: RosterPlayer) => void
  leagueSport: string
  moveToBenchEnabled: boolean
  moveToIrEnabled: boolean
}

function RosterSection({
  label,
  slot,
  players,
  drag,
  setDrag,
  onDropSection,
  onDropPlayer,
  onMovePlayer,
  onDrop,
  sectionLimit,
  onPlayerSelect,
  leagueSport,
  moveToBenchEnabled,
  moveToIrEnabled,
}: RosterSectionProps) {
  const isEmpty = players.length === 0

  return (
    <div
      className="rounded-2xl border border-white/12 bg-black/40 p-2"
      data-testid={`roster-section-${slot}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        if (drag) onDropSection(slot)
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-white/70">
        <span className="font-semibold">{label}</span>
        <span className="text-white/40">
          {players.length}
          {typeof sectionLimit === "number" && sectionLimit > 0 ? ` / ${sectionLimit}` : ""}
        </span>
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
              onMove={(toSlot) => onMovePlayer(p.id, toSlot)}
              onDropSelf={() => onDrop(p.id)}
              onSelect={() => onPlayerSelect(p)}
              leagueSport={leagueSport}
              moveToBenchEnabled={moveToBenchEnabled}
              moveToIrEnabled={moveToIrEnabled}
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
  onMove: (toSlot: RosterSectionKey) => void
  onDropSelf: () => void
  onSelect: () => void
  leagueSport: string
  moveToBenchEnabled: boolean
  moveToIrEnabled: boolean
}

function PlayerCard({
  player,
  isDragging,
  onDragStart,
  onDropOn,
  onMove,
  onDropSelf,
  onSelect,
  leagueSport,
  moveToBenchEnabled,
  moveToIrEnabled,
}: PlayerCardProps) {
  const statusColor =
    player.status === "healthy"
      ? "bg-emerald-400"
      : player.status === "q"
      ? "bg-amber-400"
      : player.status === "out"
      ? "bg-red-500"
      : "bg-purple-400"
  const logo = player.team ? teamLogoUrl(player.team, leagueSport) : ''

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
        onSelect()
      }}
      onTouchStart={() => {
        // placeholder: long-press detection for mobile can be wired here
      }}
      className={`group flex items-center justify-between gap-2 rounded-xl border border-white/14 bg-black/60 px-2.5 py-2 text-xs transition-transform transition-shadow ${
        isDragging ? "opacity-60 ring-2 ring-emerald-400/60" : "hover:-translate-y-0.5 hover:shadow-lg"
      }`}
      data-testid={`roster-player-card-${player.id}`}
    >
      <div className="flex flex-1 items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold text-white">
          {player.position}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            {logo ? (
              <img
                src={logo}
                alt={`${player.team} logo`}
                data-testid={`roster-player-team-logo-${player.id}`}
                className="h-4 w-4 rounded object-contain"
                loading="lazy"
              />
            ) : null}
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
        {moveToBenchEnabled && player.slot !== "bench" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onMove("bench")
            }}
            data-testid={`roster-move-bench-${player.id}`}
            className="rounded border border-white/15 px-1 py-0.5 text-[9px] text-white/75 hover:bg-white/10"
          >
            Bench
          </button>
        )}
        {moveToIrEnabled && player.slot !== "ir" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onMove("ir")
            }}
            data-testid={`roster-move-ir-${player.id}`}
            className="rounded border border-white/15 px-1 py-0.5 text-[9px] text-white/75 hover:bg-white/10"
          >
            IR
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDropSelf()
          }}
          data-testid={`roster-drop-${player.id}`}
          className="inline-flex items-center justify-center rounded-full border border-white/15 px-1 py-0.5 text-[9px] text-white/75 hover:bg-white/10"
        >
          <ChevronsDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}


'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { PlayerImage } from '@/app/components/PlayerImage'
import type { PlayerMap } from '@/lib/hooks/useSleeperPlayers'
import { resolvePlayerName } from '@/lib/hooks/useSleeperPlayers'
import { IDPPlayerCard } from './IDPPlayerCard'
import { IDPPlayerModal } from './IDPPlayerModal'
import {
  isOffensivePosition,
  isIdpDefensivePosition,
  mockOffensePoints,
  mockIdpPoints,
} from './idpPositionUtils'

function partitionIds(ids: string[], players: PlayerMap) {
  const off: string[] = []
  const def: string[] = []
  for (const id of ids) {
    const pos = String(players[id]?.position ?? 'BN').toUpperCase()
    if (isOffensivePosition(pos)) off.push(id)
    else if (isIdpDefensivePosition(pos)) def.push(id)
    else off.push(id)
  }
  return { off, def }
}

function OffensePlayerCard({
  playerId,
  sport,
  players,
  playersLoading,
  week,
  onOpen,
}: {
  playerId: string
  sport: string
  players: PlayerMap
  playersLoading: boolean
  week: number
  onOpen: () => void
}) {
  const resolved = resolvePlayerName(playerId, players)
  const label = playersLoading ? `Player ${playerId.slice(-4)}` : resolved.name
  const pos = resolved.position || '—'
  const { pts, proj } = mockOffensePoints(playerId, week)
  const p = players[playerId]
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative w-full rounded-lg border border-[color:var(--idp-border)] bg-[color:var(--idp-panel)] p-2 text-left transition hover:border-blue-500/30"
    >
      <span className="absolute right-2 top-2 rounded border border-[color:var(--idp-offense)]/45 bg-[color:var(--idp-offense)]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-100">
        OFF
      </span>
      <div className="flex gap-2 pr-11">
        <PlayerImage
          sleeperId={playerId}
          sport={sport}
          name={label}
          position={pos}
          espnId={p?.espn_id}
          nbaId={p?.nba_id}
          size={36}
          variant="round"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-white">{label}</p>
          <p className="text-[10px] text-white/45">
            {pos} · {resolved.team && resolved.team !== 'FA' ? resolved.team : '—'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-[color:var(--idp-offense)]">{pts}</p>
          <p className="text-[10px] text-white/35">proj {proj}</p>
        </div>
      </div>
    </button>
  )
}

export type IDPTeamDashboardProps = {
  leagueId: string
  week: number
  sport: string
  players: PlayerMap
  playersLoading: boolean
  idpViewMode: 'offense' | 'defense' | 'full'
  positionMode: string
  starterIds: string[]
  benchIds: string[]
  slotLabels?: string[]
  onOffensePlayerClick: (playerId: string) => void
}

export function IDPTeamDashboard({
  leagueId,
  week,
  sport,
  players,
  playersLoading,
  idpViewMode,
  positionMode,
  starterIds,
  benchIds,
  slotLabels,
  onOffensePlayerClick,
}: IDPTeamDashboardProps) {
  const [modalId, setModalId] = useState<string | null>(null)
  const [offBenchOpen, setOffBenchOpen] = useState(false)
  const [defBenchOpen, setDefBenchOpen] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const fn = () => setIsNarrow(mq.matches)
    fn()
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  const { startersOff, startersDef, benchOff, benchDef, offTotal, defTotal } = useMemo(() => {
    const so = partitionIds(starterIds, players)
    const bo = partitionIds(benchIds, players)
    let offPts = 0
    let defPts = 0
    for (const id of so.off) offPts += mockOffensePoints(id, week).pts
    for (const id of so.def) defPts += mockIdpPoints(id, week).pts
    for (const id of bo.off) offPts += mockOffensePoints(id, week).pts * 0.15
    for (const id of bo.def) defPts += mockIdpPoints(id, week).pts * 0.15
    return {
      startersOff: so.off,
      startersDef: so.def,
      benchOff: bo.off,
      benchDef: bo.def,
      offTotal: Math.round(offPts * 10) / 10,
      defTotal: Math.round(defPts * 10) / 10,
    }
  }, [starterIds, benchIds, players, week])

  const total = Math.round((offTotal + defTotal) * 10) / 10
  const offPct = total > 0 ? Math.round((offTotal / total) * 100) : 50

  const modalPlayer = modalId ? resolvePlayerName(modalId, players) : null

  const defenseSlots =
    positionMode === 'advanced'
      ? ['DE', 'DT', 'LB', 'LB', 'CB', 'S', 'IDP FLEX']
      : ['DL', 'DL', 'LB', 'LB', 'DB', 'DB', 'IDP FLEX']

  const showOffense = idpViewMode === 'offense' || idpViewMode === 'full'
  const showDefense = idpViewMode === 'defense' || idpViewMode === 'full'

  const maxPills = isNarrow ? 3 : 8

  const column = (child: ReactNode, key: string) => (
    <div key={key} className="min-w-0 flex-1 space-y-2">
      {child}
    </div>
  )

  return (
    <div className="space-y-4" data-idp-dashboard data-league-id={leagueId}>
      <div
        className={`sticky top-0 z-10 mb-1 flex flex-col gap-2 rounded-xl border border-[color:var(--idp-border)] bg-[#080a12]/95 p-3 backdrop-blur-sm md:flex-row md:items-center md:justify-between ${idpViewMode !== 'full' ? 'lg:static' : ''}`}
      >
        <p className="text-center text-[11px] font-semibold text-white/70 md:text-left">
          <span className="text-[color:var(--idp-offense)]">OFFENSE: {offTotal} pts</span>
          <span className="mx-2 text-white/25">—</span>
          <span className="text-[color:var(--idp-defense)]">DEFENSE: {defTotal} pts</span>
          <span className="mx-2 text-white/25">=</span>
          <span className="text-[color:var(--idp-combined)]">TOTAL: {total} pts</span>
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 md:max-w-md">
          <div
            className="flex h-full w-full"
            title={`Offense ${offPct}% / Defense ${100 - offPct}%`}
          >
            <div
              className="h-full bg-[color:var(--idp-offense)] transition-all"
              style={{ width: `${offPct}%` }}
            />
            <div
              className="h-full bg-[color:var(--idp-defense)] transition-all"
              style={{ width: `${100 - offPct}%` }}
            />
          </div>
        </div>
      </div>

      <div
        className={`grid gap-4 ${idpViewMode === 'full' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}
      >
        {showOffense
          ? column(
              <>
                <div className="sticky top-[4.5rem] z-[9] flex items-center justify-between rounded-lg border border-[color:var(--idp-offense)]/30 bg-blue-950/30 px-3 py-2 lg:static lg:top-auto">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-blue-200">
                    ⚔️ OFFENSE
                  </span>
                  <span className="text-sm font-bold text-[color:var(--idp-offense)]">{offTotal} pts</span>
                </div>
                <div className="space-y-1.5">
                  {startersOff.map((id) => (
                    <OffensePlayerCard
                      key={id}
                      playerId={id}
                      sport={sport}
                      players={players}
                      playersLoading={playersLoading}
                      week={week}
                      onOpen={() => onOffensePlayerClick(id)}
                    />
                  ))}
                </div>
                <details
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02]"
                  open={offBenchOpen}
                  onToggle={(e) => setOffBenchOpen((e.target as HTMLDetailsElement).open)}
                >
                  <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-white/55">
                    OFFENSIVE BENCH ({benchOff.length})
                  </summary>
                  <div className="space-y-1 border-t border-white/[0.06] p-2">
                    {benchOff.map((id) => (
                      <OffensePlayerCard
                        key={id}
                        playerId={id}
                        sport={sport}
                        players={players}
                        playersLoading={playersLoading}
                        week={week}
                        onOpen={() => onOffensePlayerClick(id)}
                      />
                    ))}
                  </div>
                </details>
              </>,
              'off',
            )
          : null}

        {showDefense
          ? column(
              <>
                <div className="sticky top-[4.5rem] z-[9] flex items-center justify-between rounded-lg border border-[color:var(--idp-defense)]/35 bg-red-950/25 px-3 py-2 lg:static">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-red-200">
                    🛡️ DEFENSE
                  </span>
                  <span className="text-sm font-bold text-[color:var(--idp-defense)]">{defTotal} pts</span>
                </div>
                <p className="text-[10px] text-white/35">
                  Slots ({positionMode === 'advanced' ? 'Advanced' : 'Standard'}): {defenseSlots.join(' · ')}
                </p>
                <div className="space-y-1.5">
                  {startersDef.map((id, i) => (
                    <div key={id}>
                      <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/30">
                        {slotLabels?.[starterIds.indexOf(id)] ?? defenseSlots[i] ?? `IDP ${i + 1}`}
                      </p>
                      <IDPPlayerCard
                        playerId={id}
                        name={resolvePlayerName(id, players).name}
                        position={resolvePlayerName(id, players).position || 'LB'}
                        team={resolvePlayerName(id, players).team}
                        sport={sport}
                        players={players}
                        week={week}
                        isStarter
                        maxPills={maxPills}
                        onOpen={() => setModalId(id)}
                        onToggleStart={() => {}}
                      />
                    </div>
                  ))}
                </div>
                <details
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02]"
                  open={defBenchOpen}
                  onToggle={(e) => setDefBenchOpen((e.target as HTMLDetailsElement).open)}
                >
                  <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-white/55">
                    DEFENSIVE BENCH ({benchDef.length})
                  </summary>
                  <div className="space-y-1 border-t border-white/[0.06] p-2">
                    {benchDef.map((id) => (
                      <IDPPlayerCard
                        key={id}
                        playerId={id}
                        name={resolvePlayerName(id, players).name}
                        position={resolvePlayerName(id, players).position || 'LB'}
                        team={resolvePlayerName(id, players).team}
                        sport={sport}
                        players={players}
                        week={week}
                        isStarter={false}
                        maxPills={maxPills}
                        onOpen={() => setModalId(id)}
                        onToggleStart={() => {}}
                      />
                    ))}
                  </div>
                </details>
              </>,
              'def',
            )
          : null}
      </div>

      {modalId && modalPlayer ? (
        <IDPPlayerModal
          open={Boolean(modalId)}
          onOpenChange={(o) => !o && setModalId(null)}
          playerId={modalId}
          name={modalPlayer.name}
          position={modalPlayer.position || 'LB'}
          team={modalPlayer.team}
          sport={sport}
          week={week}
          players={players}
        />
      ) : null}
    </div>
  )
}

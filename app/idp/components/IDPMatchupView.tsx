'use client'

import { useEffect, useState } from 'react'
import { IDPPlayerCard } from './IDPPlayerCard'
import { mockIdpPoints } from './idpPositionUtils'
import type { PlayerMap } from '@/lib/hooks/useSleeperPlayers'
import { resolvePlayerName } from '@/lib/hooks/useSleeperPlayers'

type Tab = 'OFFENSE' | 'DEFENSE' | 'ALL'

export type LeagueIdpMatchupViewProps = {
  yourTeamName: string
  oppTeamName: string
  week: number
  sport: string
  /** Mock / future: your vs opp player ids per side */
  yourOffenseIds: string[]
  oppOffenseIds: string[]
  yourDefenseIds: string[]
  oppDefenseIds: string[]
  players: PlayerMap
  live?: boolean
}

export function IDPMatchupView({
  yourTeamName,
  oppTeamName,
  week,
  sport,
  yourOffenseIds,
  oppOffenseIds,
  yourDefenseIds,
  oppDefenseIds,
  players,
  live = false,
}: LeagueIdpMatchupViewProps) {
  const [tab, setTab] = useState<Tab>('ALL')
  const [tick, setTick] = useState(false)

  const yOff = yourOffenseIds.reduce((s, id) => s + mockIdpPoints(id, week).pts * 0.85, 0)
  const oOff = oppOffenseIds.reduce((s, id) => s + mockIdpPoints(id, week).pts * 0.85, 0)
  const yDef = yourDefenseIds.reduce((s, id) => s + mockIdpPoints(id, week).pts, 0)
  const oDef = oppDefenseIds.reduce((s, id) => s + mockIdpPoints(id, week).pts, 0)
  const yTot = yOff + yDef
  const oTot = oOff + oDef

  useEffect(() => {
    if (!live) return
    const id = window.setInterval(() => setTick((t) => !t), 4000)
    return () => window.clearInterval(id)
  }, [live])

  const splitBar = (y: number, o: number) => {
    const t = y + o
    if (t <= 0) {
      return (
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 bg-[color:var(--idp-offense)]/70" />
          <div className="h-full w-1/2 bg-[color:var(--idp-defense)]/70" />
        </div>
      )
    }
    return (
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-[color:var(--idp-offense)]"
          style={{ width: `${(y / t) * 100}%` }}
        />
        <div
          className="h-full bg-[color:var(--idp-defense)]"
          style={{ width: `${(o / t) * 100}%` }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-wide text-white/40">Week {week}</p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm font-bold text-white">
          <span>{yourTeamName}</span>
          <span className="text-white/30">vs</span>
          <span>{oppTeamName}</span>
          {live ? (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
              LIVE
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-[color:var(--idp-border)] bg-[color:var(--idp-panel)] p-4">
        <div>
          <div className="mb-1 flex justify-between text-[11px] font-semibold text-[color:var(--idp-offense)]">
            <span>OFFENSE</span>
            <span>
              <span className={tick ? 'idp-score-tick-pulse' : ''}>{yOff.toFixed(1)}</span>
              {' — '}
              <span>{oOff.toFixed(1)}</span>
            </span>
          </div>
          {splitBar(yOff, oOff)}
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[11px] font-semibold text-[color:var(--idp-defense)]">
            <span>DEFENSE</span>
            <span>
              {yDef.toFixed(1)} — {oDef.toFixed(1)}
            </span>
          </div>
          {splitBar(yDef, oDef)}
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm font-bold text-white">
            <span>TOTAL</span>
            <span>
              {yTot.toFixed(1)} — {oTot.toFixed(1)}
            </span>
          </div>
          {splitBar(yTot, oTot)}
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border border-white/[0.08] bg-black/20 p-1">
        {(['OFFENSE', 'DEFENSE', 'ALL'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-2 text-[11px] font-bold ${
              tab === t ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/75'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'DEFENSE' || tab === 'ALL' ? (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/35">IDP matchup rows</p>
          {yourDefenseIds.map((id, i) => {
            const oid = oppDefenseIds[i] ?? oppDefenseIds[0] ?? id
            const yPts = mockIdpPoints(id, week).pts
            const oPts = mockIdpPoints(oid, week).pts
            const leadYou = yPts >= oPts
            return (
              <div
                key={`${id}-${oid}`}
                className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-white/[0.06] p-2 ${
                  leadYou ? 'opacity-100' : 'opacity-90'
                }`}
              >
                <div className={leadYou ? 'opacity-100' : 'opacity-70'}>
                  <IDPPlayerCard
                    playerId={id}
                    name={resolvePlayerName(id, players).name}
                    position={resolvePlayerName(id, players).position || 'LB'}
                    team={resolvePlayerName(id, players).team}
                    sport={sport}
                    players={players}
                    week={week}
                    isStarter
                    maxPills={3}
                    onOpen={() => {}}
                  />
                </div>
                <div className="flex flex-col items-center gap-0.5 text-center">
                  <span className="text-lg font-bold text-white">{yPts.toFixed(1)}</span>
                  <span className="text-[10px] text-white/35">|</span>
                  <span className="text-lg font-bold text-white">{oPts.toFixed(1)}</span>
                </div>
                <div className={!leadYou ? 'opacity-100' : 'opacity-70'}>
                  <IDPPlayerCard
                    playerId={oid}
                    name={resolvePlayerName(oid, players).name}
                    position={resolvePlayerName(oid, players).position || 'LB'}
                    team={resolvePlayerName(oid, players).team}
                    sport={sport}
                    players={players}
                    week={week}
                    isStarter
                    maxPills={3}
                    onOpen={() => {}}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {tab === 'OFFENSE' ? (
        <p className="text-center text-xs text-white/45">Offensive matchup rows reuse your league scores feed (placeholder).</p>
      ) : null}
    </div>
  )
}

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { DraftBoardCell, type DraftBoardCellPick } from './DraftBoardCell'
import type { DraftPickSnapshot, SlotOrderEntry, TradedPickRecord } from '@/lib/live-draft-engine/types'
import type { KeeperSessionSnapshot } from '@/lib/live-draft-engine/types'
import { formatPickLabel, getSlotInRoundForOverall } from '@/lib/live-draft-engine/DraftOrderService'
import { resolvePickOwner } from '@/lib/live-draft-engine/PickOwnershipResolver'
import { getRoundNavigationState } from '@/lib/draft-room/DraftBoardRenderer'
import { getManagerColorBySeed } from '@/lib/draft-room'

export type DraftBoardProps = {
  picks: DraftPickSnapshot[]
  slotOrder: SlotOrderEntry[]
  tradedPicks?: TradedPickRecord[]
  teamCount: number
  rounds: number
  draftType: 'snake' | 'linear' | 'auction'
  thirdRoundReversal: boolean
  tradedPickColorMode?: boolean
  showNewOwnerInRed?: boolean
  /** Keeper locks to show on board (pre-draft locked slots) */
  keeperLocks?: KeeperSessionSnapshot['locks']
  /** Devy: 1-based round numbers that are devy-only (show "Devy" on empty slots) */
  devyRounds?: number[]
  /** C2C: 1-based round numbers that are college-only (show "College" on empty slots) */
  c2cCollegeRounds?: number[]
  currentOverallPick?: number | null
  sport?: string
}

function DraftBoardInner({
  picks,
  slotOrder,
  tradedPicks = [],
  teamCount,
  rounds,
  draftType,
  thirdRoundReversal,
  tradedPickColorMode = false,
  showNewOwnerInRed = false,
  keeperLocks = [],
  devyRounds = [],
  c2cCollegeRounds = [],
  currentOverallPick = null,
  sport,
}: DraftBoardProps) {
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all')
  const [selectedRound, setSelectedRound] = useState(1)

  useEffect(() => {
    setSelectedRound((prev) => Math.min(Math.max(1, prev), Math.max(1, rounds)))
  }, [rounds])

  const pickByKey = useMemo(() => {
    const map: Record<string, DraftPickSnapshot> = {}
    for (const p of picks) {
      const key = `${p.round}-${p.slot}`
      map[key] = p
    }
    return map
  }, [picks])

  const keeperByKey = useMemo(() => {
    const map: Record<string, (typeof keeperLocks)[number]> = {}
    for (const k of keeperLocks) {
      map[`${k.round}-${k.slot}`] = k
    }
    return map
  }, [keeperLocks])

  const totalPicks = rounds * teamCount
  const grid: { round: number; slot: number; overall: number; pick: DraftBoardCellPick }[] = []
  for (let overall = 1; overall <= totalPicks; overall++) {
    const round = Math.ceil(overall / teamCount)
    const slot = getSlotInRoundForOverall({
      overall,
      teamCount,
      draftType,
      thirdRoundReversal,
    })
    const key = `${round}-${slot}`
    const existing = pickByKey[key]
    const lock = keeperByKey[key]
    const resolved = resolvePickOwner(round, slot, slotOrder, tradedPicks)
    const ownerSeed = resolved?.rosterId ?? resolved?.displayName ?? `${slot}-${round}`
    const ownerColor = getManagerColorBySeed(ownerSeed)
    const resolvedTradedMeta = (existing?.tradedPickMeta ?? resolved?.tradedPickMeta)
      ? {
          ...(existing?.tradedPickMeta ?? resolved?.tradedPickMeta),
          tintColor: (existing?.tradedPickMeta ?? resolved?.tradedPickMeta)?.tintColor ?? ownerColor.tintHex,
        }
      : null
    const source = String((existing as { source?: string | null } | undefined)?.source ?? '').toLowerCase()
    const isDevyRound = devyRounds.includes(round)
    const isCollegeRound = c2cCollegeRounds.includes(round)
    const c2cEnabled = c2cCollegeRounds.length > 0
    const isCollegePick =
      c2cEnabled &&
      !!existing &&
      (source === 'college' || isCollegeRound)
    const isProPick =
      c2cEnabled &&
      !!existing &&
      !isCollegePick
    const isDevyPick =
      !c2cEnabled &&
      (source === 'devy' ||
        source === 'college' ||
        (!!existing && isDevyRound && source !== 'promoted_devy'))
    const isPromotedFromDevy = source === 'promoted_devy'
    const useLock = !existing && lock
    grid.push({
      round,
      slot,
      overall,
      pick: {
        overall,
        round,
        slot,
        pickLabel: formatPickLabel(overall, teamCount),
        playerName: existing?.playerName ?? lock?.playerName ?? null,
        position: existing?.position ?? lock?.position ?? null,
        team: existing?.team ?? lock?.team ?? null,
        playerId: existing?.playerId ?? lock?.playerId ?? null,
        sport: sport ?? null,
        injuryStatus: (existing as { injuryStatus?: string | null } | undefined)?.injuryStatus ?? null,
        byeWeek: existing?.byeWeek ?? null,
        displayName: existing?.displayName ?? lock?.displayName ?? resolved?.displayName ?? null,
        tradedPickMeta: resolvedTradedMeta,
        managerTintColor: ownerColor.tintHex,
        amount: existing?.amount ?? null,
        isKeeper: useLock ?? undefined,
        isDevyPick: isDevyPick || undefined,
        isCollegePick: isCollegePick || undefined,
        isProPick: isProPick || undefined,
        isPromotedFromDevy: isPromotedFromDevy || undefined,
        source: source || undefined,
      },
    })
  }

  const byRound = useMemo(() => {
    const map: Record<number, typeof grid> = {}
    for (const row of grid) {
      if (!map[row.round]) map[row.round] = []
      map[row.round].push(row)
    }
    for (const r of Object.keys(map)) {
      const arr = map[Number(r)]
      arr.sort((a, b) => a.slot - b.slot)
    }
    return map
  }, [grid])

  const navigation = getRoundNavigationState(selectedRound, rounds)
  const visibleRounds =
    viewMode === 'single'
      ? [navigation.round]
      : Array.from({ length: rounds }, (_, i) => i + 1)

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#060d1e]" data-testid="draft-board">
      <div className="border-b border-white/8 px-2 py-1.5 text-xs font-medium text-white/70 flex items-center justify-between gap-2">
        <span>Draft board</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="draft-board-prev-round"
            onClick={() => setSelectedRound((prev) => Math.max(1, prev - 1))}
            disabled={!navigation.canGoPrev}
            className="rounded border border-white/15 bg-black/20 px-2 py-1 text-[10px] text-white/70 hover:bg-white/10 disabled:opacity-40"
          >
            Prev
          </button>
          <select
            value={navigation.round}
            data-testid="draft-board-round-selector"
            onChange={(event) => setSelectedRound(Math.max(1, Number(event.target.value) || 1))}
            className="rounded border border-white/15 bg-black/30 px-2 py-1 text-[10px] text-white"
            aria-label="Draft board round selector"
          >
            {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => (
              <option key={round} value={round}>
                Round {round}
              </option>
            ))}
          </select>
          <button
            type="button"
            data-testid="draft-board-next-round"
            onClick={() => setSelectedRound((prev) => Math.min(rounds, prev + 1))}
            disabled={!navigation.canGoNext}
            className="rounded border border-white/15 bg-black/20 px-2 py-1 text-[10px] text-white/70 hover:bg-white/10 disabled:opacity-40"
          >
            Next
          </button>
          <button
            type="button"
            data-testid="draft-board-toggle-view-mode"
            onClick={() => setViewMode((prev) => (prev === 'all' ? 'single' : 'all'))}
            className="rounded border border-cyan-300/35 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-100 hover:bg-cyan-500/20"
          >
            {viewMode === 'all' ? 'Focus round' : 'All rounds'}
          </button>
        </div>
      </div>
      <div className="px-2 py-1 text-[10px] text-white/50 border-b border-white/8" data-testid="draft-board-round-label">
        {viewMode === 'all' ? `All rounds (${rounds})` : navigation.label}
      </div>
      <div className="overflow-auto p-1.5 sm:p-2">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="w-12 border-b border-white/8 py-1 text-left text-white/45">Rd</th>
              {Array.from({ length: teamCount }, (_, i) => (
                <th
                  key={i}
                  className="min-w-[72px] border-b border-white/8 px-1 py-1 text-center text-white/45"
                >
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRounds.map((round) => (
              <tr key={round} data-testid={`draft-board-round-${round}`}>
                <td className="border-b border-white/5 py-1 pl-2 font-medium text-white/55">
                  {round}
                </td>
                {(byRound[round] ?? []).map(({ pick }) => (
                  <td key={pick.overall} className="border-b border-white/5 p-1">
                    <DraftBoardCell
                      pick={pick}
                      isEmpty={!pick.playerName}
                      isCurrentPick={currentOverallPick != null && pick.overall === currentOverallPick}
                      tradedPickColorMode={tradedPickColorMode}
                      showNewOwnerInRed={showNewOwnerInRed}
                      isDevyRound={devyRounds.includes(round) && !pick.playerName}
                      isCollegeRound={c2cCollegeRounds.includes(round) && !pick.playerName}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export const DraftBoard = React.memo(DraftBoardInner)

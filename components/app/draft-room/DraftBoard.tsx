'use client'

import React, { useMemo } from 'react'
import { DraftBoardCell, type DraftBoardCellPick } from './DraftBoardCell'
import type { DraftPickSnapshot, SlotOrderEntry, TradedPickRecord } from '@/lib/live-draft-engine/types'
import type { KeeperSessionSnapshot } from '@/lib/live-draft-engine/types'
import { formatPickLabel, getSlotInRoundForOverall } from '@/lib/live-draft-engine/DraftOrderService'
import { resolvePickOwner } from '@/lib/live-draft-engine/PickOwnershipResolver'

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
}: DraftBoardProps) {
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
        byeWeek: existing?.byeWeek ?? null,
        displayName: existing?.displayName ?? lock?.displayName ?? resolved?.displayName ?? null,
        tradedPickMeta: existing?.tradedPickMeta ?? resolved?.tradedPickMeta ?? null,
        amount: existing?.amount ?? null,
        isKeeper: useLock ?? undefined,
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

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-white/12 bg-black/25">
      <div className="border-b border-white/10 px-2 py-1.5 text-xs font-medium text-white/70">
        Draft board
      </div>
      <div className="overflow-auto p-2">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="w-12 border-b border-white/10 py-1 text-left text-white/50">Rd</th>
              {Array.from({ length: teamCount }, (_, i) => (
                <th
                  key={i}
                  className="min-w-[72px] border-b border-white/10 px-1 py-1 text-center text-white/50"
                >
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => (
              <tr key={round}>
                <td className="border-b border-white/5 py-1 pl-2 font-medium text-white/60">
                  {round}
                </td>
                {(byRound[round] ?? []).map(({ pick }) => (
                  <td key={pick.overall} className="border-b border-white/5 p-1">
                    <DraftBoardCell
                      pick={pick}
                      isEmpty={!pick.playerName}
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

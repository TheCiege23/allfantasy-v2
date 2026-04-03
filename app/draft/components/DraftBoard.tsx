'use client'

import { useMemo } from 'react'
import type { DraftPickRecord, DraftPickOrderEntry } from '../types'
import { ManagerHeader } from './ManagerHeader'
import { PickCell } from './PickCell'
function overallForManagerColumn(round: number, managerCol: number, numTeams: number): number {
  if (round % 2 === 1) return (round - 1) * numTeams + (managerCol + 1)
  return round * numTeams - managerCol
}

type Props = {
  numTeams: number
  numRounds: number
  pickOrder: DraftPickOrderEntry[]
  picks: DraftPickRecord[]
  currentOverall: number
}

export function DraftBoard({ numTeams, numRounds, pickOrder, picks, currentOverall }: Props) {
  const byOverall = useMemo(() => {
    const m = new Map<number, DraftPickRecord>()
    for (const p of picks) {
      m.set(p.overallPick, p)
    }
    return m
  }, [picks])

  return (
    <div className="flex max-h-[40vh] min-h-[200px] flex-col overflow-auto rounded-lg border border-white/[0.08] bg-[#0d1117]">
      <div className="sticky left-0 top-0 z-20 flex bg-[#0d1117] pb-1 pl-14 pt-2">
        <ManagerHeader slots={pickOrder} />
      </div>
      <div className="flex min-w-max flex-col gap-1 p-2">
        {Array.from({ length: numRounds }, (_, ri) => {
          const round = ri + 1
          return (
            <div key={round} className="flex items-stretch gap-1">
              <div className="sticky left-0 z-10 flex w-12 shrink-0 items-center justify-center rounded bg-white/[0.04] text-[10px] font-bold text-white/50">
                R{round}
              </div>
              {Array.from({ length: numTeams }, (_, mi) => {
                const overall = overallForManagerColumn(round, mi, numTeams)
                const pick = byOverall.get(overall) ?? null
                const pickInRound = round % 2 === 1 ? mi + 1 : numTeams - mi
                const pickLabel = `${round}.${String(pickInRound).padStart(2, '0')}`
                return (
                  <div key={`${round}-${mi}`} className="w-[100px] shrink-0">
                    <PickCell
                      pickLabel={pickLabel}
                      pick={pick}
                      managerIndex={mi}
                      isCurrentPick={overall === currentOverall && !pick?.playerName}
                      isTraded={pick?.isTraded}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import React from 'react'

export type DraftBoardCellPick = {
  overall: number
  round: number
  slot: number
  pickLabel: string
  playerName: string | null
  position: string | null
  team: string | null
  byeWeek: number | null
  displayName: string | null
  /** Auction: winning bid amount */
  amount?: number | null
  /** Keeper: locked keeper pick */
  isKeeper?: boolean
  tradedPickMeta?: {
    newOwnerName?: string
    previousOwnerName?: string
    showNewOwnerInRed?: boolean
    tintColor?: string
  } | null
}

export type DraftBoardCellProps = {
  pick: DraftBoardCellPick
  isEmpty: boolean
  tradedPickColorMode?: boolean
  showNewOwnerInRed?: boolean
  /** When true and empty, show "Devy" slot marker */
  isDevyRound?: boolean
  /** When true and empty, show "College" slot marker (C2C) */
  isCollegeRound?: boolean
}

function DraftBoardCellInner({
  pick,
  isEmpty,
  tradedPickColorMode = false,
  showNewOwnerInRed = false,
  isDevyRound = false,
  isCollegeRound = false,
}: DraftBoardCellProps) {
  const tint =
    tradedPickColorMode && pick.tradedPickMeta?.tintColor
      ? { borderColor: `${pick.tradedPickMeta.tintColor}60`, backgroundColor: `${pick.tradedPickMeta.tintColor}15` }
      : undefined

  return (
    <div
      className="flex min-h-[52px] flex-col rounded-lg border border-white/10 bg-black/30 p-1.5 text-[10px] transition-colors hover:border-white/20"
      style={tint}
      data-overall={pick.overall}
      data-round={pick.round}
      data-slot={pick.slot}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="tabular-nums font-medium text-white/70">{pick.pickLabel}</span>
        {pick.displayName && (
          <span className="max-w-[60px] truncate text-white/50" title={pick.displayName}>
            {pick.displayName}
          </span>
        )}
      </div>
      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center text-white/30">
          {isCollegeRound ? (
            <span className="rounded bg-violet-500/25 px-1 text-[9px] font-medium text-violet-200">College</span>
          ) : isDevyRound ? (
            <span className="rounded bg-violet-500/25 px-1 text-[9px] font-medium text-violet-200">Devy</span>
          ) : (
            '—'
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          {pick.isKeeper && (
            <span className="mb-0.5 inline-block rounded bg-emerald-500/30 px-1 text-[9px] font-medium text-emerald-200">K</span>
          )}
          {pick.amount != null && pick.amount > 0 && (
            <span className="text-amber-400/90 font-medium">${pick.amount}</span>
          )}
          {pick.playerName && (
            <span className="truncate font-medium text-white" title={pick.playerName}>
              {pick.playerName}
            </span>
          )}
          {(pick.position || pick.team) && (
            <span className="text-white/55">
              {[pick.position, pick.team].filter(Boolean).join(' · ')}
            </span>
          )}
          {pick.byeWeek != null && pick.byeWeek > 0 && (
            <span className="text-white/45">Bye {pick.byeWeek}</span>
          )}
          {showNewOwnerInRed && pick.tradedPickMeta?.newOwnerName && (
            <span className="truncate text-red-400" title={pick.tradedPickMeta.newOwnerName}>
              → {pick.tradedPickMeta.newOwnerName}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export const DraftBoardCell = React.memo(DraftBoardCellInner)

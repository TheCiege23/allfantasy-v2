'use client'

import { cn } from '@/lib/utils'
import type { DraftPickRecord } from '../types'
import { TradedPickBadge } from './TradedPickBadge'
import { managerColorForIndex } from './manager-colors'

type PickCellProps = {
  pickLabel: string
  pick?: DraftPickRecord | null
  managerIndex: number
  isCurrentPick: boolean
  isTraded?: boolean
}

export function PickCell({ pickLabel, pick, managerIndex, isCurrentPick, isTraded }: PickCellProps) {
  const isPicked = Boolean(pick?.playerName)
  const mgr = managerColorForIndex(managerIndex)

  return (
    <div
      className={cn(
        'relative min-h-[64px] rounded-xl border p-1.5 text-xs shadow-inner shadow-black/25 transition-colors duration-200',
        isCurrentPick &&
          'animate-pulse border-cyan-400/40 bg-cyan-500/[0.07] ring-2 ring-cyan-400/60 shadow-[0_0_22px_-6px_rgba(34,211,238,0.55)]',
        !isCurrentPick && isTraded && 'ring-1 ring-amber-400/80',
        isPicked && !isCurrentPick && 'border-white/15',
        isPicked && mgr.bg,
        !isPicked && !isCurrentPick && 'border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent hover:border-white/15 hover:bg-white/[0.07]',
      )}
      title={pick ? `${pick.playerName ?? ''} · ${pick.timestamp}` : pickLabel}
    >
      <span className="font-mono text-[10px] tabular-nums text-white/40">{pickLabel}</span>
      {isPicked ? (
        <div className={cn('mt-0.5 truncate font-medium', mgr.text)}>
          <div className="truncate">{pick!.playerName}</div>
          <div className="text-[9px] text-white/50">
            {pick!.position} {pick!.team ? `· ${pick!.team}` : ''}
          </div>
        </div>
      ) : (
        <div className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-white/30">OPEN</div>
      )}
      {isTraded ? <TradedPickBadge /> : null}
    </div>
  )
}

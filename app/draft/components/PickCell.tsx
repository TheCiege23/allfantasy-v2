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
        'relative min-h-[60px] rounded border p-1 text-xs',
        isCurrentPick && 'animate-pulse ring-2 ring-white',
        isTraded && 'ring-1 ring-amber-400',
        isPicked && mgr.bg,
        !isPicked && 'bg-slate-900/80',
      )}
      title={pick ? `${pick.playerName ?? ''} · ${pick.timestamp}` : pickLabel}
    >
      <span className="text-[10px] text-slate-500">{pickLabel}</span>
      {isPicked ? (
        <div className={cn('mt-0.5 truncate font-medium', mgr.text)}>
          <div className="truncate">{pick!.playerName}</div>
          <div className="text-[9px] text-white/50">
            {pick!.position} {pick!.team ? `· ${pick!.team}` : ''}
          </div>
        </div>
      ) : null}
      {isTraded ? <TradedPickBadge /> : null}
    </div>
  )
}

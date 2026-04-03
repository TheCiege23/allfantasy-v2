'use client'

import { POSITION_COLORS } from '@/lib/draft/positions'

export type RecentPick = {
  id: string
  playerName: string
  position: string
  team?: string | null
  managerName?: string | null
}

export function RecentPicksBar({ picks }: { picks: RecentPick[] }) {
  const row = picks.slice(-20).reverse()
  return (
    <div className="flex h-14 shrink-0 items-stretch gap-2 overflow-x-auto border-y border-white/[0.05] bg-[#0a0e17] px-2 py-1">
      {row.map((p) => {
        const c = POSITION_COLORS[p.position] ?? '#569cd6'
        return (
          <div
            key={p.id}
            className="flex min-w-[140px] shrink-0 flex-col justify-center rounded border border-white/[0.06] bg-[#12192a] px-2 py-1"
            style={{ borderLeftWidth: 3, borderLeftColor: c }}
          >
            <p className="truncate text-[12px] font-bold text-white">{p.playerName}</p>
            <p className="text-[10px] text-white/50">
              {p.position}
              {p.team ? ` · ${p.team}` : ''}
            </p>
            {p.managerName ? (
              <p className="truncate text-[9px] text-white/30">by {p.managerName}</p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

'use client'

import type { DraftPickSnapshot } from '@/lib/live-draft-engine/types'

export type DraftPickActivityStripProps = {
  picks: DraftPickSnapshot[]
  slotOrder: Array<{ rosterId: string; displayName: string }>
  limit?: number
}

export function DraftPickActivityStrip({ picks, slotOrder, limit = 14 }: DraftPickActivityStripProps) {
  const nameByRoster = new Map(slotOrder.map((s) => [s.rosterId, s.displayName]))
  const recent = picks.slice(-limit).reverse()

  return (
    <div
      className="flex h-full min-h-[72px] flex-col border-r border-white/8 bg-[#050c1d]/95 md:min-w-[200px]"
      data-testid="draft-activity-strip"
    >
      <div className="shrink-0 border-b border-white/8 px-2 py-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-white/45">Live activity</p>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-auto px-2 py-1.5">
        <ul className="flex gap-2 md:flex-col md:gap-1.5">
          {recent.length === 0 ? (
            <li className="text-[10px] text-white/35">No picks yet.</li>
          ) : (
            recent.map((p) => (
              <li
                key={p.id}
                className="shrink-0 rounded-lg border border-white/10 bg-[#0a1228] px-2 py-1.5 text-[10px] md:shrink md:px-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white/90 truncate">{p.playerName}</span>
                  <span className="shrink-0 tabular-nums text-cyan-200/80">#{p.overall}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-1 text-[9px] text-white/45">
                  <span>
                    {p.position}
                    {p.team ? ` · ${p.team}` : ''}
                  </span>
                  <span className="truncate max-w-[100px]" title={nameByRoster.get(p.rosterId) ?? ''}>
                    {nameByRoster.get(p.rosterId) ?? 'Team'}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}

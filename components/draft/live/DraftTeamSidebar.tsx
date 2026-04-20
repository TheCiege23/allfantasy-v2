'use client'

import type { SlotOrderEntry } from '@/lib/live-draft-engine/types'

export function DraftTeamSidebar({
  slotOrder,
  onClockRosterId,
}: {
  slotOrder: SlotOrderEntry[]
  onClockRosterId?: string | null
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#070d18]/90" data-testid="draft-team-sidebar">
      <div className="border-b border-white/[0.06] px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">Draft order</p>
      </div>
      <ul className="max-h-[min(60vh,520px)] divide-y divide-white/[0.05] overflow-y-auto">
        {slotOrder.map((s) => {
          const active = onClockRosterId && s.rosterId === onClockRosterId
          return (
            <li
              key={`${s.slot}-${s.rosterId}`}
              className={`flex items-center justify-between gap-2 px-3 py-2 text-[12px] ${
                active ? 'bg-cyan-500/10 text-cyan-100' : 'text-white/80'
              }`}
            >
              <span className="font-mono text-white/45">{s.slot}.</span>
              <span className="min-w-0 flex-1 truncate text-right font-medium">{s.displayName}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

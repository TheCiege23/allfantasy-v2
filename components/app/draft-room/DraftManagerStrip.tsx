'use client'

import { User } from 'lucide-react'
import { getManagerColorBySlot, withAlpha } from '@/lib/draft-room'

export type ManagerSlot = {
  slot: number
  rosterId: string
  displayName: string
  /** If this pick was traded, show metadata */
  tradedPickMeta?: { newOwnerName?: string; previousOwnerName?: string; tintColor?: string } | null
}

export type DraftManagerStripProps = {
  managers: ManagerSlot[]
  activeRosterId: string | null
  tradedPickColorMode?: boolean
  /** Optional: show new owner name in red on traded picks */
  showNewOwnerInRed?: boolean
  /** Optional: e.g. "Weighted Lottery Order" when order came from lottery */
  orderSourceLabel?: string | null
}

export function DraftManagerStrip({
  managers,
  activeRosterId,
  tradedPickColorMode = false,
  showNewOwnerInRed = false,
  orderSourceLabel,
}: DraftManagerStripProps) {
  return (
    <div className="border-b border-white/8 bg-[#081022] px-3 py-2">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-white/50">
          Draft order
        </span>
        {orderSourceLabel && (
          <span className="rounded border border-amber-400/30 bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-300/90">
            {orderSourceLabel}
          </span>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" data-testid="draft-manager-strip">
        {managers.map((m) => {
          const isActive = m.rosterId === activeRosterId
          const color = getManagerColorBySlot(m.slot)
          const tradedTint =
            tradedPickColorMode && m.tradedPickMeta?.tintColor
              ? { borderColor: withAlpha(m.tradedPickMeta.tintColor, 0.6), backgroundColor: withAlpha(m.tradedPickMeta.tintColor, 0.14) }
              : undefined

          return (
            <div
              key={m.rosterId}
              className={`flex min-w-[118px] items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs transition-all ${color.chipClass} ${
                isActive ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0a0a0f]' : ''
              }`}
              style={tradedTint ?? { borderColor: withAlpha(color.tintHex, 0.5), backgroundColor: withAlpha(color.tintHex, 0.12) }}
              data-slot={m.slot}
              data-roster-id={m.rosterId}
              data-testid={`draft-manager-slot-${m.slot}`}
            >
              <span className="tabular-nums text-white/70">{m.slot}</span>
              <User className="h-3 w-3 text-white/60" />
              <span className={`max-w-[88px] truncate font-medium md:max-w-[120px] ${color.textClass}`}>
                {m.displayName}
              </span>
              {isActive && (
                <span className="rounded border border-cyan-300/35 bg-cyan-500/15 px-1 py-0.5 text-[9px] text-cyan-100">
                  LIVE
                </span>
              )}
              {showNewOwnerInRed && m.tradedPickMeta?.newOwnerName && (
                <span className="max-w-[60px] truncate text-red-400" title={`Now: ${m.tradedPickMeta.newOwnerName}`}>
                  → {m.tradedPickMeta.newOwnerName}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

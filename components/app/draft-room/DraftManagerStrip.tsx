'use client'

import { User } from 'lucide-react'

const MANAGER_COLORS = [
  'bg-cyan-500/20 border-cyan-400/50 text-cyan-100',
  'bg-emerald-500/20 border-emerald-400/50 text-emerald-100',
  'bg-violet-500/20 border-violet-400/50 text-violet-100',
  'bg-amber-500/20 border-amber-400/50 text-amber-100',
  'bg-rose-500/20 border-rose-400/50 text-rose-100',
  'bg-sky-500/20 border-sky-400/50 text-sky-100',
  'bg-fuchsia-500/20 border-fuchsia-400/50 text-fuchsia-100',
  'bg-lime-500/20 border-lime-400/50 text-lime-100',
  'bg-orange-500/20 border-orange-400/50 text-orange-100',
  'bg-teal-500/20 border-teal-400/50 text-teal-100',
  'bg-indigo-500/20 border-indigo-400/50 text-indigo-100',
  'bg-pink-500/20 border-pink-400/50 text-pink-100',
]

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
    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-black/20 px-3 py-2">
      <span className="mr-2 text-[10px] font-medium uppercase tracking-wider text-white/50">
        Draft order
      </span>
      {orderSourceLabel && (
        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-300/90 border border-amber-400/30">
          {orderSourceLabel}
        </span>
      )}
      {managers.map((m, i) => {
        const isActive = m.rosterId === activeRosterId
        const colorClass = MANAGER_COLORS[(m.slot - 1) % MANAGER_COLORS.length]
        const tradedTint =
          tradedPickColorMode && m.tradedPickMeta?.tintColor
            ? { borderColor: m.tradedPickMeta.tintColor, backgroundColor: `${m.tradedPickMeta.tintColor}20` }
            : undefined

        return (
          <div
            key={m.rosterId}
            className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs transition-all ${colorClass} ${
              isActive ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0a0a0f]' : ''
            }`}
            style={tradedTint}
            data-slot={m.slot}
            data-roster-id={m.rosterId}
          >
            <span className="tabular-nums text-white/70">{m.slot}</span>
            <User className="h-3 w-3 text-white/60" />
            <span className="max-w-[80px] truncate font-medium md:max-w-[120px]">
              {m.displayName}
            </span>
            {showNewOwnerInRed && m.tradedPickMeta?.newOwnerName && (
              <span className="max-w-[60px] truncate text-red-400" title={`Now: ${m.tradedPickMeta.newOwnerName}`}>
                → {m.tradedPickMeta.newOwnerName}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

'use client'

import type { RosterSlot } from '@/lib/sportConfig/types'

export function RosterSlotEditor({
  slots,
  slotCounts,
  onChangeCount,
  disabled,
}: {
  slots: RosterSlot[]
  slotCounts: Record<string, number>
  onChangeCount: (key: string, count: number) => void
  disabled: boolean
}) {
  let starters = 0
  for (const s of slots) {
    starters += slotCounts[s.key] ?? s.defaultCount
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/[0.08] bg-[#0a1220]/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-white/90">Roster slots</p>
        <p className="text-[11px] text-white/45">
          Total starters: <span className="font-mono text-sky-300">{starters}</span>
        </p>
      </div>
      <div className="space-y-2">
        {slots.map((s) => {
          const n = slotCounts[s.key] ?? s.defaultCount
          return (
            <div key={s.key} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[12px] text-white/70">{s.label}</span>
              <input
                type="number"
                min={s.minCount}
                max={s.maxCount}
                disabled={disabled}
                className="w-24 rounded border border-white/[0.12] bg-[#080c14] px-2 py-1 text-right text-[12px] text-white"
                value={n}
                onChange={(e) => {
                  const v = Math.min(s.maxCount, Math.max(s.minCount, Number(e.target.value) || 0))
                  onChangeCount(s.key, v)
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

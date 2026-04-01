'use client'

import { useState } from 'react'
import type { ADPRanking } from '@/lib/workers/adp-blender'

export function ADPEditor({
  rankings,
  onSave,
}: {
  rankings: ADPRanking[]
  onSave?: (rankings: ADPRanking[]) => void
}) {
  const [items, setItems] = useState(rankings)

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= items.length) return
    const next = [...items]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item)
    setItems(next.map((entry, order) => ({ ...entry, adp: order + 1 })))
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-[#081121] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">Custom ADP</p>
        {onSave ? (
          <button
            type="button"
            onClick={() => onSave(items)}
            className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-sm font-semibold text-cyan-100"
          >
            Save Rankings
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        {items.slice(0, 40).map((entry, index) => (
          <div key={`${entry.playerId}-${index}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="w-8 text-xs text-white/50">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{entry.playerName}</p>
              <p className="text-xs text-white/55">
                {entry.position}
                {entry.team ? ` • ${entry.team}` : ''}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70"
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

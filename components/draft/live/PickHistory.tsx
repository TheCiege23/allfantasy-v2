'use client'

import type { DraftPickSnapshot } from '@/lib/live-draft-engine/types'

export function PickHistory({
  picks,
  max = 24,
}: {
  picks: DraftPickSnapshot[]
  max?: number
}) {
  const rows = picks.slice(-max).reverse()
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#070d18]/90" data-testid="draft-pick-history">
      <div className="border-b border-white/[0.06] px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">Recent picks</p>
      </div>
      <ul className="max-h-[min(50vh,420px)] divide-y divide-white/[0.05] overflow-y-auto">
        {rows.length === 0 ? (
          <li className="px-3 py-6 text-center text-[12px] text-white/40">No picks yet</li>
        ) : (
          rows.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-2 px-3 py-2 text-[12px]">
              <span className="shrink-0 font-mono text-cyan-300/90">{p.pickLabel}</span>
              <span className="min-w-0 flex-1 text-right text-white/90">
                <span className="font-semibold">{p.playerName}</span>
                <span className="text-white/45">
                  {' '}
                  {p.position}
                  {p.team ? ` · ${p.team}` : ''}
                </span>
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

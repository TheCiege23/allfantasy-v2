'use client'

import { useState } from 'react'
import type { SupportedSport } from '@/lib/sport-scope'

type SubTab = 'lineup' | 'roster' | 'contest' | 'history'

export type BestBallTabProps = {
  leagueId: string
  sport: SupportedSport | string
}

export function BestBallTab({ leagueId, sport }: BestBallTabProps) {
  const [sub, setSub] = useState<SubTab>('lineup')
  const [week, setWeek] = useState(1)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 text-[#e6edf3]">
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {(['lineup', 'roster', 'contest', 'history'] as const).map((id) => (
          <button
            key={id}
            type="button"
            data-testid={`bestball-sub-${id}`}
            onClick={() => setSub(id)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
              sub === id ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/5 text-white/50 hover:text-white/80'
            }`}
          >
            {id === 'lineup' ? 'Optimized Lineup' : id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[12px] text-white/45">
        <span>Sport: {String(sport)}</span>
        <span className="text-white/25">|</span>
        <label className="flex items-center gap-1">
          Week
          <input
            type="number"
            min={1}
            max={24}
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
            className="w-14 rounded border border-white/15 bg-[#0a1228] px-2 py-1 text-white"
          />
        </label>
      </div>

      {sub === 'lineup' && (
        <div className="rounded-xl border border-white/10 bg-[#0a1228]/80 p-4">
          <h2 className="text-sm font-semibold text-white">Week {week} — Auto-optimized lineup</h2>
          <p className="mt-1 text-[12px] text-white/45">
            League {leagueId.slice(0, 8)}… — use the Redraft tab to confirm your season; optimized rows appear after
            scores sync.
          </p>
          <p className="mt-4 border-t border-white/10 pt-3 text-[11px] text-white/35">
            Best Ball: starters are auto-optimized each scoring period — no manual lineup moves.
          </p>
        </div>
      )}

      {sub !== 'lineup' && (
        <div className="rounded-xl border border-white/10 bg-[#0a1228]/60 p-4 text-[13px] text-white/50">
          {sub === 'roster' && 'Full roster grid + depth warnings ship with roster API wiring.'}
          {sub === 'contest' && 'Tournament hub lives under /bestball/contest/[contestId] when linked.'}
          {sub === 'history' && 'Weekly history chart pending optimizer persistence.'}
        </div>
      )}
    </div>
  )
}

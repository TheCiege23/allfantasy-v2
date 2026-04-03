'use client'

import { useState } from 'react'
import type { SupportedSport } from '@/lib/sport-scope'

type Sub = 'board' | 'team' | 'waivers' | 'history' | 'storylines'

export type GuillotineTabProps = {
  leagueId: string
  sport: SupportedSport | string
}

export function GuillotineTab({ leagueId, sport }: GuillotineTabProps) {
  const [sub, setSub] = useState<Sub>('board')

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 text-[#e6edf3]">
      <div className="rounded-xl border border-red-500/20 bg-[#0a1228]/90 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-red-300/90">Guillotine survival</p>
        <h2 className="mt-1 text-lg font-bold text-white">Lowest score each period is eliminated</h2>
        <p className="mt-1 text-[12px] text-white/45">
          League {leagueId.slice(0, 8)}… · {String(sport)} — connect a guillotine season to load live chop line.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {(
          [
            ['board', 'Survival Board'],
            ['team', 'My Team'],
            ['waivers', 'Waiver Pool'],
            ['history', 'History'],
            ['storylines', 'Storylines'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-testid={`guillotine-sub-${id}`}
            onClick={() => setSub(id)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
              sub === id ? 'bg-red-500/20 text-red-100' : 'bg-white/5 text-white/50 hover:text-white/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sub === 'board' && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-[#040915]/80 p-4">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-white">Survival board</span>
            <span className="text-[11px] text-white/40">Scores lock — wire SSE `guillotine_score_update`</span>
          </header>
          <p className="text-[13px] text-white/55">
            Ranked list of active teams by live score will appear here once `/api/guillotine/standings` is wired to
            your season.
          </p>
        </div>
      )}

      {sub !== 'board' && (
        <div className="rounded-xl border border-white/10 bg-[#0a1228]/60 p-4 text-[13px] text-white/50">
          {sub === 'team' && 'Roster + floor-focused tools — use AfSub AI routes when enabled.'}
          {sub === 'waivers' && 'Guillotine releases from `/api/guillotine/releases`.'}
          {sub === 'history' && 'Elimination timeline from `/api/guillotine/history`.'}
          {sub === 'storylines' && 'Drama-first recaps via `/api/guillotine/ai/storyline` (AfSub).'}
        </div>
      )}
    </div>
  )
}

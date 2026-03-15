'use client'

import type { BroadcastMatchupRow } from '@/lib/broadcast-engine/types'

export interface LiveScoreRendererProps {
  matchups: BroadcastMatchupRow[]
  leagueName: string | null
  sport: string
  week: number | null
  className?: string
}

export function LiveScoreRenderer({
  matchups,
  leagueName,
  sport,
  week,
  className = '',
}: LiveScoreRendererProps) {
  if (matchups.length === 0) {
    return (
      <div className={`flex min-h-[200px] flex-col items-center justify-center rounded-2xl bg-black/40 p-8 ${className}`}>
        <p className="text-2xl font-semibold text-white md:text-3xl">{leagueName ?? 'League'}</p>
        <p className="mt-2 text-lg text-zinc-400">No matchups this week</p>
        {week != null && <p className="mt-1 text-zinc-500">Week {week}</p>}
      </div>
    )
  }

  return (
    <div className={`space-y-6 rounded-2xl bg-black/40 p-6 md:p-8 ${className}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white md:text-4xl">{leagueName ?? 'League'}</h2>
        <p className="mt-1 text-lg text-zinc-400">
          {sport}
          {week != null && ` · Week ${week}`}
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {matchups.map((m) => (
          <div
            key={m.matchupId}
            className="rounded-xl border border-white/10 bg-white/5 p-5 text-center"
          >
            <div className="flex items-center justify-center gap-4">
              <div className="min-w-0 flex-1 text-right">
                <p className="truncate text-lg font-semibold text-white md:text-xl">{m.teamAName}</p>
                <p className="text-3xl font-bold text-amber-400 md:text-4xl">{m.scoreA.toFixed(1)}</p>
              </div>
              <span className="text-zinc-500">vs</span>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-lg font-semibold text-white md:text-xl">{m.teamBName}</p>
                <p className="text-3xl font-bold text-amber-400 md:text-4xl">{m.scoreB.toFixed(1)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

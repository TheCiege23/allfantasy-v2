'use client'

import { Swords, Bell } from 'lucide-react'

export interface ZombieAmbushBoardProps {
  leagueId: string
  week: number
  matchups: { teamA: string; teamB: string; scoreA?: number; scoreB?: number }[]
  ambushUsed?: boolean
  displayNames: Record<string, string>
}

export function ZombieAmbushBoard({
  week,
  matchups,
  ambushUsed,
  displayNames,
}: ZombieAmbushBoardProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <Swords className="h-5 w-5 text-amber-400" />
          Current Week Matchups
        </h2>
        <p className="mb-4 text-xs text-white/50">Week {week}</p>
        {!matchups.length ? (
          <p className="text-sm text-white/50">No matchups loaded.</p>
        ) : (
          <ul className="space-y-2">
            {matchups.map((m, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
              >
                <span className="text-white/90">{displayNames[m.teamA] ?? m.teamA}</span>
                <span className="text-white/50">vs</span>
                <span className="text-white/90">{displayNames[m.teamB] ?? m.teamB}</span>
                {m.scoreA != null && m.scoreB != null && (
                  <span className="tabular-nums text-white/60">
                    {m.scoreA.toFixed(1)} – {m.scoreB.toFixed(1)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-rose-500/30 bg-rose-950/10 p-4 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-rose-200">
          <Bell className="h-5 w-5" />
          Ambush Watch
        </h2>
        {ambushUsed ? (
          <p className="text-sm text-rose-200">An ambush was used this week. Check notifications for details.</p>
        ) : (
          <p className="text-sm text-white/70">No ambush used this week yet.</p>
        )}
      </section>
    </div>
  )
}

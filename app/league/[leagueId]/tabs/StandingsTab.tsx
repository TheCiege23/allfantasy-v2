'use client'

import { useState } from 'react'
import type { UserLeague } from '@/app/dashboard/types'
import { LeagueTabPlaceholder } from './LeagueTabPlaceholder'

type Row = {
  team: string
  off: number
  def: number
  total: number
}

const MOCK: Row[] = [
  { team: 'Team A', off: 1240.2, def: 310.4, total: 1550.6 },
  { team: 'Team B', off: 1198.0, def: 298.1, total: 1496.1 },
  { team: 'Team C', off: 1150.4, def: 332.0, total: 1482.4 },
]

export function StandingsTab({
  league,
  tabLabel = 'Standings',
  idpLeagueUi = false,
}: {
  league: UserLeague
  tabLabel?: string
  idpLeagueUi?: boolean
}) {
  const [mode, setMode] = useState<'combined' | 'offense' | 'defense'>('combined')

  if (!idpLeagueUi) {
    return <LeagueTabPlaceholder league={league} tabLabel={tabLabel} />
  }

  const sorted = [...MOCK].sort((a, b) => {
    if (mode === 'offense') return b.off - a.off
    if (mode === 'defense') return b.def - a.def
    return b.total - a.total
  })

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-wrap gap-2">
        {(['combined', 'offense', 'defense'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold capitalize ${
              mode === m
                ? m === 'offense'
                  ? 'border-[color:var(--idp-offense)] bg-blue-950/40 text-blue-100'
                  : m === 'defense'
                    ? 'border-[color:var(--idp-defense)] bg-red-950/40 text-red-100'
                    : 'border-[color:var(--idp-combined)] bg-violet-950/40 text-violet-100'
                : 'border-white/10 text-white/45 hover:bg-white/[0.04]'
            }`}
          >
            {m === 'combined' ? 'Combined' : m === 'offense' ? 'Offense only' : 'Defense only'}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[color:var(--idp-border)] bg-[color:var(--idp-panel)]">
        <table className="w-full min-w-[420px] text-left text-[12px] text-white/85">
          <thead>
            <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-white/40">
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2 text-right text-[color:var(--idp-offense)]">OFF</th>
              <th className="px-3 py-2 text-right text-[color:var(--idp-defense)]">IDP</th>
              <th className="px-3 py-2 text-right font-bold text-white">Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.team} className="border-b border-white/[0.05]">
                <td className="px-3 py-2">
                  <span className="mr-2 text-white/35">{i + 1}</span>
                  {r.team}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{r.off.toFixed(1)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.def.toFixed(1)}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{r.total.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-white/35">
        Illustrative IDP standings — wire to live scoring when your league season is active.
      </p>
    </div>
  )
}

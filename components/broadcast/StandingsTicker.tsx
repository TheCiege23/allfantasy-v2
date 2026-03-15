'use client'

import type { BroadcastStandingRow } from '@/lib/broadcast-engine/types'

export interface StandingsTickerProps {
  standings: BroadcastStandingRow[]
  leagueName: string | null
  sport: string
  className?: string
}

export function StandingsTicker({
  standings,
  leagueName,
  sport,
  className = '',
}: StandingsTickerProps) {
  if (standings.length === 0) {
    return (
      <div className={`flex min-h-[200px] flex-col items-center justify-center rounded-2xl bg-black/40 p-6 ${className}`}>
        <h2 className="text-xl font-bold text-white md:text-2xl">{leagueName ?? 'League'}</h2>
        <p className="mt-2 text-zinc-500">No standings data</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 rounded-2xl bg-black/40 p-6 md:p-8 ${className}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white md:text-4xl">{leagueName ?? 'League'}</h2>
        <p className="mt-1 text-lg text-zinc-400">{sport} · Standings</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-zinc-400">
              <th className="pb-2 pr-4 text-sm font-medium md:text-base">#</th>
              <th className="pb-2 pr-4 text-sm font-medium md:text-base">Team</th>
              <th className="pb-2 pr-4 text-sm font-medium md:text-base">Owner</th>
              <th className="pb-2 pr-4 text-right text-sm font-medium md:text-base">W-L-T</th>
              <th className="pb-2 text-right text-sm font-medium md:text-base">PF</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr key={row.teamId} className="border-b border-white/5">
                <td className="py-3 pr-4 text-lg font-bold text-amber-400 md:text-xl">{row.rank}</td>
                <td className="py-3 pr-4 font-semibold text-white md:text-lg">{row.teamName}</td>
                <td className="py-3 pr-4 text-zinc-400 md:text-base">{row.ownerName}</td>
                <td className="py-3 pr-4 text-right text-white md:text-lg">
                  {row.wins}-{row.losses}-{row.ties}
                </td>
                <td className="py-3 text-right font-mono text-white md:text-lg">{row.pointsFor.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

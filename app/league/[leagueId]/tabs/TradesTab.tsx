'use client'

import { ArrowLeftRight } from 'lucide-react'
import type { LeagueTeamSlot, UserLeague } from '@/app/dashboard/types'

export type TradesTabProps = {
  league: UserLeague
  teams: LeagueTeamSlot[]
}

export function TradesTab({ league, teams }: TradesTabProps) {
  return (
    <div className="space-y-4 p-5">
      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-start">
        <section className="rounded-2xl border border-white/[0.07] bg-[#0c0c1e] p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-white">Active Trades</h2>
            <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-cyan-500/20 px-1.5 text-[11px] font-bold text-cyan-300">
              0
            </span>
          </div>
          <div className="mt-6 flex flex-col items-center py-8 text-center">
            <p className="text-sm text-white/45">No active trades yet…</p>
            <button
              type="button"
              className="mt-3 text-xs font-bold uppercase tracking-wide text-cyan-400 hover:text-cyan-300"
            >
              Propose a trade
            </button>
          </div>
        </section>

        <div className="flex justify-center lg:sticky lg:top-24">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-cyan-500/90 to-violet-600/90 px-5 py-2.5 text-sm font-bold text-white shadow-lg"
          >
            <ArrowLeftRight className="h-4 w-4" />
            TRADE
          </button>
        </div>

        <section className="rounded-2xl border border-white/[0.07] bg-[#0c0c1e] p-4">
          <h2 className="text-sm font-bold text-white">Trade Block</h2>
          <div className="mt-6 flex flex-col items-center py-8 text-center">
            <p className="text-sm text-white/45">No players on the trade block yet</p>
            <p className="mt-2 text-xs text-white/30">
              {league.name} · {teams.length} teams
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

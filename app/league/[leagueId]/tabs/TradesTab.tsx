'use client'

import type { LeagueTeamSlot, UserLeague } from '@/app/dashboard/types'

export type TradesTabProps = {
  league: UserLeague
  teams: LeagueTeamSlot[]
}

/** Placeholder — full Trades tab in a follow-up commit. */
export function TradesTab({ league }: TradesTabProps) {
  return (
    <div className="p-5 text-sm text-white/45">
      Trades tab for <span className="text-white/70">{league.name}</span>…
    </div>
  )
}

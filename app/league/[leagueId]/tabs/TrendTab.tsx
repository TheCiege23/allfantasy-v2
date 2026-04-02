'use client'

import type { UserLeague } from '@/app/dashboard/types'

export type TrendTabProps = {
  league: UserLeague
  onPlayerClick: (playerId: string) => void
}

/** Placeholder — full Trend tab in a follow-up commit. */
export function TrendTab({ league }: TrendTabProps) {
  return (
    <div className="p-5 text-sm text-white/45">
      Trend tab for <span className="text-white/70">{league.name}</span>…
    </div>
  )
}

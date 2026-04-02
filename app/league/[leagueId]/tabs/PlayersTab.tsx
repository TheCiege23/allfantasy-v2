'use client'

import type { UserLeague } from '@/app/dashboard/types'

export type PlayersTabProps = {
  league: UserLeague
  onPlayerClick: (playerId: string) => void
}

/** Placeholder — full Players tab in a follow-up commit. */
export function PlayersTab({ league }: PlayersTabProps) {
  return (
    <div className="p-5 text-sm text-white/45">
      Players tab for <span className="text-white/70">{league.name}</span>…
    </div>
  )
}

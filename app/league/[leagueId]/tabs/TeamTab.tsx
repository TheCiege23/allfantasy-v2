'use client'

import type { LeagueTeam } from '@prisma/client'
import type { UserLeague } from '@/app/dashboard/types'

export type TeamTabProps = {
  league: UserLeague
  userTeam: LeagueTeam | null
  onPlayerClick: (playerId: string) => void
  inviteToken?: string | null
}

/** Placeholder — full Team tab in the next commit. */
export function TeamTab({ league }: TeamTabProps) {
  return (
    <div className="p-5 text-sm text-white/45">
      Team tab for <span className="text-white/70">{league.name}</span>…
    </div>
  )
}

'use client'

import type { UserLeague } from '@/app/dashboard/types'

export type ScoresTabProps = {
  league: UserLeague
}

/** Placeholder — full Scores tab in a follow-up commit. */
export function ScoresTab({ league }: ScoresTabProps) {
  return (
    <div className="p-5 text-sm text-white/45">
      Scores tab for <span className="text-white/70">{league.name}</span>…
    </div>
  )
}

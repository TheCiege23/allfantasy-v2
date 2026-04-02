'use client'

import type { UserLeague } from '../types'

export type TodayStripProps = {
  leagues: UserLeague[]
}

/**
 * Stub attention items — replace with real waiver / lineup / trade APIs later.
 */
export function TodayStrip({ leagues }: TodayStripProps) {
  if (leagues.length === 0) {
    return null
  }

  const n = leagues.length
  const lineupLabel = n === 1 ? '1 lineup to set' : `${n} lineups to set`

  return (
    <section className="space-y-1.5">
      <p className="text-[9px] uppercase tracking-widest text-white/25">Today</p>
      <div className="scrollbar-none flex gap-2 overflow-x-auto py-1">
        {/* stub: wire waiver close time */}
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-[11px] text-white/75">
          📋 Waivers close tonight
        </span>
        {/* stub: wire lineup lock / unset count */}
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-[11px] text-white/75">
          ⚠ {lineupLabel}
        </span>
        {/* stub: wire pending trades */}
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-[11px] text-white/75">
          🔄 No pending trades
        </span>
      </div>
    </section>
  )
}

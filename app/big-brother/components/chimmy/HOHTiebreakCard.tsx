'use client'

import type { BigBrotherSummary } from '@/components/big-brother/types'

/** Reserved for HOH tie-break week when engine exposes tie state on summary. */
export function HOHTiebreakCard({
  leagueId: _leagueId,
  show,
  summary: _summary,
}: {
  leagueId: string
  show: boolean
  summary?: BigBrotherSummary | null
}) {
  if (!show) return null
  return (
    <div className="rounded-xl border border-amber-500/50 bg-amber-950/30 p-4">
      <h3 className="text-base font-bold text-amber-100">⚖️ It&apos;s a tie. You must cast the deciding vote.</h3>
      <p className="mt-1 text-[12px] text-amber-200/80">2h countdown — wire when tie-break phase is exposed in summary API.</p>
    </div>
  )
}

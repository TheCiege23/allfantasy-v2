'use client'

/**
 * [NEW] Jury Center: jury members list, finalist summary cards, finale vote panel when active. PROMPT 4.
 */

import type { BigBrotherSummary } from './types'

export interface BigBrotherJuryCenterProps {
  leagueId: string
  summary: BigBrotherSummary
}

export function BigBrotherJuryCenter({ leagueId, summary }: BigBrotherJuryCenterProps) {
  const names = summary.rosterDisplayNames ?? {}
  const jury = summary.jury ?? []

  const isJuryMember = summary.myRosterId && jury.some((j) => j.rosterId === summary.myRosterId)
  const finaleSize = summary.config?.finaleFormat === 'final_3' ? 3 : 2
  const remainingCount = summary.remainingCount ?? 0
  const finaleReached = remainingCount > 0 && remainingCount <= finaleSize

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-4">
        <h3 className="text-sm font-medium text-purple-200">Jury members</h3>
        {jury.length === 0 ? (
          <p className="mt-1 text-sm text-white/50">No jury yet. Jury starts per league config (after X eliminations or when X players remain).</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-purple-100">
            {jury.map((j) => (
              <li key={j.rosterId}>
                {names[j.rosterId] ?? j.rosterId} <span className="text-white/40">(evicted week {j.evictedWeek})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {finaleReached && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
          <h3 className="text-sm font-medium text-amber-200">Finale</h3>
          <p className="mt-1 text-xs text-white/60">
            Final {finaleSize} reached. Jury votes for the winner. Finale vote is private and tallied by the engine.
          </p>
        </div>
      )}

      {isJuryMember && finaleReached && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-sm font-medium text-white/90">Your finale vote</h3>
          <p className="mt-1 text-xs text-white/50">Vote for who you want to win. (Finale voting UI: submit via API when finale is open.)</p>
          <p className="mt-2 text-xs text-white/40">Use Chimmy or the league AI to submit your finale vote when the commissioner opens finale voting.</p>
        </div>
      )}

      <p className="text-xs text-white/40">Finalist summaries and season narratives are available from the AI Finale Moderator (Chimmy / Big Brother AI).</p>
    </div>
  )
}

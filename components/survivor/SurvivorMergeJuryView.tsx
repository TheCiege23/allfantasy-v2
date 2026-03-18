'use client'

import { Users, Scale, Calendar } from 'lucide-react'
import type { SurvivorSummary } from './types'

export interface SurvivorMergeJuryViewProps {
  leagueId: string
  summary: SurvivorSummary
  names: Record<string, string>
}

/**
 * Merge / Jury View: merged tribe identity, jury members, finalist path, finale timeline.
 */
export function SurvivorMergeJuryView({ summary, names }: SurvivorMergeJuryViewProps) {
  const { merged, jury, config, votedOutHistory } = summary
  const mergeWeek = config.mergeWeek ?? 0

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Users className="h-5 w-5 text-amber-400" />
          Merge status
        </h2>
        {merged ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
            <p className="font-medium text-amber-200">The merge has happened.</p>
            <p className="mt-1 text-sm text-white/60">All remaining players are one tribe. Tribal Council now includes everyone.</p>
          </div>
        ) : (
          <p className="text-sm text-white/70">
            Merge triggers at week <strong className="text-white">{mergeWeek}</strong> (or by player count if configured). Pre-merge: one tribe attends Tribal Council each week.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Scale className="h-5 w-5 text-cyan-400" />
          Jury
        </h2>
        {config.juryStartAfterMerge && (
          <p className="mb-3 text-sm text-white/50">Jury starts after merge. Voted-out players join the jury.</p>
        )}
        {jury.length === 0 ? (
          <p className="text-sm text-white/50">No jury members yet.</p>
        ) : (
          <ul className="space-y-2">
            {jury.map((j) => (
              <li
                key={j.rosterId}
                className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-sm"
              >
                <span className="text-white/80">{names[j.rosterId] ?? j.rosterId}</span>
                <span className="text-white/50">Voted out Week {j.votedOutWeek}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
          <Calendar className="h-5 w-5 text-white/60" />
          Finale timeline
        </h2>
        <p className="text-sm text-white/50">Final tribal council and winner are determined by league settings. Check League or Commissioner tab for dates.</p>
      </section>
    </div>
  )
}

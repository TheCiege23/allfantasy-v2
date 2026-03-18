'use client'

import { Lock, Unlock, Trophy, History } from 'lucide-react'
import type { SurvivorSummary } from './types'

export interface SurvivorChallengeCenterProps {
  leagueId: string
  summary: SurvivorSummary
  names: Record<string, string>
}

/**
 * Challenge Center: active mini-game, submission windows, locked state, tribe result history, reward/advantage outputs.
 */
export function SurvivorChallengeCenter({ summary, names }: SurvivorChallengeCenterProps) {
  const { challenges, currentWeek } = summary
  const weekChallenges = challenges.filter((c) => c.week === currentWeek)
  const locked = weekChallenges.filter((c) => c.lockAt && new Date(c.lockAt) < new Date())
  const open = weekChallenges.filter((c) => !c.resultJson && (!c.lockAt || new Date(c.lockAt) >= new Date()))
  const completed = challenges.filter((c) => c.resultJson)

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Trophy className="h-5 w-5 text-amber-400" />
          Active challenges · Week {currentWeek}
        </h2>
        {open.length === 0 && locked.length === 0 ? (
          <p className="text-sm text-white/50">No challenges this week yet.</p>
        ) : (
          <div className="space-y-3">
            {open.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3"
              >
                <div className="flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-emerald-400" />
                  <span className="font-medium text-white">{c.challengeType}</span>
                </div>
                <span className="text-xs text-white/60">
                  Submissions: {c.submissionCount} · Lock: {c.lockAt ? new Date(c.lockAt).toLocaleString() : '—'}
                </span>
              </div>
            ))}
            {locked.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-white/50" />
                  <span className="font-medium text-white/80">{c.challengeType}</span>
                </div>
                <span className="text-xs text-white/50">Locked · {c.submissionCount} submission(s)</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <History className="h-5 w-5 text-white/60" />
          Challenge result history
        </h2>
        {completed.length === 0 ? (
          <p className="text-sm text-white/50">No completed challenges yet.</p>
        ) : (
          <ul className="space-y-2">
            {completed.slice(0, 20).map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 px-3 py-2 text-sm"
              >
                <span className="text-white/80">Week {c.week} · {c.challengeType}</span>
                <span className="text-white/50">Resolved</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

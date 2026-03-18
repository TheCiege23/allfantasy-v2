'use client'

import { Users, Shield, Trophy } from 'lucide-react'
import type { SurvivorSummary } from './types'

export interface SurvivorTribeBoardProps {
  leagueId: string
  summary: SurvivorSummary
  names: Record<string, string>
}

/**
 * Tribe Board: tribe members, names/logos, leader, tribe score, immunity status, active challenge status.
 */
export function SurvivorTribeBoard({ summary, names }: SurvivorTribeBoardProps) {
  const { tribes, council, challenges, currentWeek } = summary
  const attendingTribeId = council?.attendingTribeId ?? null
  const activeChallenges = challenges.filter((c) => !c.resultJson)

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Users className="h-5 w-5 text-amber-400" />
          Tribe overview
        </h2>
        <p className="mb-4 text-sm text-white/50">Week {currentWeek}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tribes.map((tribe) => {
            const hasImmunity = false
            const isAttending = tribe.id === attendingTribeId
            return (
              <div
                key={tribe.id}
                className={`rounded-xl border p-4 ${
                  isAttending
                    ? 'border-amber-500/40 bg-amber-950/20'
                    : 'border-white/10 bg-black/20'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-white">{tribe.name}</h3>
                  {hasImmunity && (
                    <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-300">
                      <Shield className="h-3 w-3" /> Immunity
                    </span>
                  )}
                  {isAttending && (
                    <span className="text-xs text-amber-300">Attending Tribal Council</span>
                  )}
                </div>
                <ul className="space-y-1">
                  {tribe.members.map((m) => (
                    <li
                      key={m.rosterId}
                      className="flex items-center gap-2 text-sm text-white/80"
                    >
                      {m.isLeader && <Trophy className="h-3.5 w-3.5 text-amber-400" />}
                      {names[m.rosterId] ?? m.rosterId}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-white/50">Tribe score: —</p>
              </div>
            )
          })}
        </div>
      </section>

      {activeChallenges.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <h2 className="mb-2 text-lg font-semibold text-white">Active challenge status</h2>
          <p className="mb-3 text-sm text-white/50">
            {activeChallenges.length} challenge(s) open this week. Go to Challenge Center to submit.
          </p>
          <ul className="space-y-1 text-sm text-white/70">
            {activeChallenges.map((c) => (
              <li key={c.id}>
                {c.challengeType} · {c.submissionCount} submission(s)
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

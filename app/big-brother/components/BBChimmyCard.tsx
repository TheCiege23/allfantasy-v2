'use client'

import { useCallback, useEffect, useState } from 'react'
import type { BigBrotherSummary } from '@/components/big-brother/types'
import { HOHNominationCard } from '@/app/big-brother/components/chimmy/HOHNominationCard'
import { ReplacementNomineeCard } from '@/app/big-brother/components/chimmy/ReplacementNomineeCard'
import { VetoDecisionCard } from '@/app/big-brother/components/chimmy/VetoDecisionCard'
import { EvictionVoteCard } from '@/app/big-brother/components/chimmy/EvictionVoteCard'
import { JuryVoteCard } from '@/app/big-brother/components/chimmy/JuryVoteCard'
import { HOHTiebreakCard } from '@/app/big-brother/components/chimmy/HOHTiebreakCard'
import { StatusCard } from '@/app/big-brother/components/chimmy/StatusCard'
import { DeadlinesCard } from '@/app/big-brother/components/chimmy/DeadlinesCard'
import { VetoChallengeCard } from '@/app/big-brother/components/chimmy/VetoChallengeCard'
import { CommissionerChallengeScoreCard } from '@/app/big-brother/components/chimmy/CommissionerChallengeScoreCard'
import { HaveNotSelectorCard } from '@/app/big-brother/components/chimmy/HaveNotSelectorCard'
import { HaveNotStatusCard } from '@/app/big-brother/components/chimmy/HaveNotStatusCard'

export function BBChimmyCard({ leagueId }: { leagueId: string }) {
  const [summary, setSummary] = useState<BigBrotherSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/big-brother/summary`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string }).error ?? `Error ${res.status}`)
        setSummary(null)
        return
      }
      setSummary(data as BigBrotherSummary)
    } catch {
      setError('Failed to load')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !summary) {
    return <p className="text-sm text-white/50">Loading…</p>
  }
  if (error && !summary) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-200">
        {error}
      </div>
    )
  }
  if (!summary) return null

  const cycle = summary.cycle
  const phase = cycle?.phase ?? ''
  const finaleSize = summary.config.finaleFormat === 'final_3' ? 3 : 2
  const finaleActive = (summary.remainingCount ?? 99) <= finaleSize

  return (
    <div className="space-y-4" data-testid="bb-chimmy-stack">
      <div className="flex flex-wrap gap-2">
        <StatusCard leagueId={leagueId} />
        <DeadlinesCard leagueId={leagueId} />
      </div>

      {summary.myStatus === 'HOH' && phase === 'NOMINATION_OPEN' && cycle ? (
        <HOHNominationCard leagueId={leagueId} summary={summary} onDone={load} />
      ) : null}

      {summary.myStatus === 'HOH' && phase === 'REPLACEMENT_NOMINATION_OPEN' && cycle ? (
        <ReplacementNomineeCard leagueId={leagueId} summary={summary} onDone={load} />
      ) : null}

      {summary.myStatus === 'VETO_WINNER' && phase === 'VETO_DECISION_OPEN' && cycle ? (
        <VetoDecisionCard leagueId={leagueId} summary={summary} onDone={load} />
      ) : null}

      {phase === 'VOTING_OPEN' && summary.ballot?.canVote && cycle ? (
        <EvictionVoteCard leagueId={leagueId} summary={summary} onDone={load} />
      ) : null}

      {summary.myStatus === 'JURY' && finaleActive ? (
        <JuryVoteCard leagueId={leagueId} summary={summary} onDone={load} />
      ) : null}

      {phase === 'VETO_CHALLENGE_OPEN' && cycle ? (
        <VetoChallengeCard leagueId={leagueId} summary={summary} onDone={load} />
      ) : null}

      {summary.isCommissioner && (phase === 'HOH_OPEN' || phase === 'VETO_CHALLENGE_OPEN') ? (
        <CommissionerChallengeScoreCard leagueId={leagueId} summary={summary} onDone={load} />
      ) : null}

      {summary.isCommissioner && cycle ? (
        <HaveNotSelectorCard
          leagueId={leagueId}
          rosterDisplayNames={summary.rosterDisplayNames}
          allActiveRosterIds={summary.eligibility?.canBeNominated ?? []}
          onDone={load}
        />
      ) : null}

      {!summary.isCommissioner && summary.haveNotRosterIds?.includes(summary.myRosterId ?? '') && cycle ? (
        <HaveNotStatusCard weekNumber={cycle.week} />
      ) : null}

      <HOHTiebreakCard leagueId={leagueId} show={false} />
    </div>
  )
}

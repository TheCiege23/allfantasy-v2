'use client'

/**
 * [NEW] Big Brother league home: HOH, nominees, veto, countdowns, jury, eliminated, timeline. PROMPT 4.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Home, Calendar, Vote, Users, Settings, MessageSquare, Sparkles, ChevronDown } from 'lucide-react'
import type { BigBrotherSummary, BigBrotherView } from './types'
import { BigBrotherStatusBadge } from './BigBrotherStatusBadge'
import { BigBrotherCeremonyCenter } from './BigBrotherCeremonyCenter'
import { BigBrotherVotingBallot } from './BigBrotherVotingBallot'
import { BigBrotherJuryCenter } from './BigBrotherJuryCenter'
import { BigBrotherCommissionerPanel } from './BigBrotherCommissionerPanel'
import { useUserTimezone } from '@/hooks/useUserTimezone'

const VIEW_LABELS: Record<BigBrotherView, string> = {
  house: 'House',
  ceremony: 'Ceremony Center',
  voting: 'Voting',
  jury: 'Jury',
  commissioner: 'Commissioner',
}

export interface BigBrotherHomeProps {
  leagueId: string
  isCommissioner?: boolean
}

export function BigBrotherHome({ leagueId, isCommissioner }: BigBrotherHomeProps) {
  const { formatInTimezone } = useUserTimezone()
  const [summary, setSummary] = useState<BigBrotherSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<BigBrotherView>('house')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/big-brother/summary`, { cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `Error ${res.status}`)
        setSummary(null)
        return
      }
      const data = await res.json()
      setSummary(data)
    } catch {
      setError('Failed to load Big Brother')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !summary) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-8">
        <p className="text-sm text-white/60">Loading Big Brother…</p>
      </div>
    )
  }

  if (error && !summary) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
        <p className="text-sm text-amber-200">{error}</p>
        <button type="button" onClick={() => load()} className="mt-2 text-xs text-cyan-400 hover:underline">
          Retry
        </button>
      </div>
    )
  }

  const names = summary?.rosterDisplayNames ?? {}
  const cycle = summary?.cycle
  const phase = cycle?.phase ?? '—'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-950/30 sm:h-16 sm:w-16">
            <Home className="h-7 w-7 text-amber-400 sm:h-8 sm:w-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Big Brother</h1>
            <p className="text-sm text-white/60">
              HOH · Block · Veto · Eviction · Jury
            </p>
          </div>
        </div>
        {summary?.myStatus && (
          <BigBrotherStatusBadge status={summary.myStatus} />
        )}
      </header>

      {summary?.sportCalendar?.scoringWindowDisclaimer ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3 text-sm text-amber-200/90">
          <p className="font-medium text-amber-200/95">Scoring window note</p>
          <p className="mt-1 text-amber-200/80">{summary.sportCalendar.scoringWindowDisclaimer}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/app/league/${leagueId}?tab=Chat`}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-2 text-sm text-amber-200 hover:bg-amber-950/50"
        >
          <MessageSquare className="h-4 w-4" /> League Chat
        </Link>
        <Link href={`/app/league/${leagueId}?tab=Settings`} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10">
          <Settings className="h-4 w-4" /> Settings
        </Link>
        <Link href={`/app/league/${leagueId}?tab=Intelligence`} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10">
          <Sparkles className="h-4 w-4" /> Chimmy Host
        </Link>
      </div>

      {/* View switcher */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-white/50 sm:hidden">View:</span>
        <div className="relative sm:hidden">
          <select
            value={view}
            onChange={(e) => setView(e.target.value as BigBrotherView)}
            className="rounded-xl border border-white/20 bg-white/5 py-2 pl-3 pr-8 text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            {(Object.keys(VIEW_LABELS) as BigBrotherView[]).map((v) => (
              <option key={v} value={v}>{VIEW_LABELS[v]}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
        </div>
        <div className="hidden flex-wrap gap-1 sm:flex">
          {(Object.keys(VIEW_LABELS) as BigBrotherView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-sm ${view === v ? 'bg-amber-500/20 text-amber-200' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {view === 'house' && summary && (
        <div className="space-y-4">
          {!cycle && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
              <h3 className="text-sm font-medium text-amber-200">No active week</h3>
              <p className="mt-1 text-sm text-amber-200/80">
                The game has not started yet. Commissioner: go to the <strong>Commissioner</strong> tab and run <strong>Start week 1</strong> to create the first cycle.
              </p>
            </div>
          )}
          {/* Phase & Week */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-medium text-white/80">Week {cycle?.week ?? '—'}</h3>
            <p className="text-xs text-white/50">Phase: {phase}</p>
          </div>

          {/* HOH Card */}
          {cycle?.hohRosterId && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
              <h3 className="text-xs font-medium uppercase text-amber-300/80">Head of Household</h3>
              <p className="mt-1 text-lg font-semibold text-amber-200">{names[cycle.hohRosterId] ?? cycle.hohRosterId}</p>
            </div>
          )}

          {/* Nominees (On the Block) */}
          {summary.finalNomineeRosterIds.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4">
              <h3 className="text-xs font-medium uppercase text-red-300/80">On the Block</h3>
              <ul className="mt-2 space-y-1">
                {summary.finalNomineeRosterIds.map((id) => (
                  <li key={id} className="text-red-200">{names[id] ?? id}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Veto */}
          {cycle?.vetoWinnerRosterId && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
              <h3 className="text-xs font-medium uppercase text-cyan-300/80">Veto Winner</h3>
              <p className="mt-1 text-cyan-200">{names[cycle.vetoWinnerRosterId] ?? cycle.vetoWinnerRosterId}</p>
              {cycle.vetoUsed && (
                <p className="mt-1 text-xs text-cyan-300/80">Veto was used. Replacement nominee: {cycle.replacementNomineeRosterId ? names[cycle.replacementNomineeRosterId] ?? cycle.replacementNomineeRosterId : '—'}</p>
              )}
            </div>
          )}

          {/* Countdowns */}
          {summary.ballot && !summary.ballot.closed && summary.ballot.voteDeadlineAt && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-xs font-medium uppercase text-white/50">Vote deadline</h3>
              <p className="mt-1 text-sm text-white/80">{formatInTimezone(summary.ballot.voteDeadlineAt)}</p>
            </div>
          )}

          {/* Jury tracker */}
          {summary.jury.length > 0 && (
            <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-4">
              <h3 className="text-xs font-medium uppercase text-purple-300/80">Jury ({summary.jury.length})</h3>
              <p className="mt-1 text-sm text-purple-200">
                {summary.jury.slice(0, 5).map((j) => names[j.rosterId] ?? j.rosterId).join(', ')}
                {summary.jury.length > 5 && ` +${summary.jury.length - 5} more`}
              </p>
            </div>
          )}

          {/* Eliminated list */}
          {summary.eligibility?.eliminatedRosterIds.length ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-xs font-medium uppercase text-white/50">Evicted</h3>
              <ul className="mt-1 flex flex-wrap gap-2 text-sm text-white/60">
                {summary.eligibility.eliminatedRosterIds.map((id) => (
                  <li key={id}>{names[id] ?? id}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {view === 'ceremony' && summary && (
        <BigBrotherCeremonyCenter leagueId={leagueId} summary={summary} />
      )}

      {view === 'voting' && summary && (
        <BigBrotherVotingBallot leagueId={leagueId} summary={summary} onVoted={load} />
      )}

      {view === 'jury' && summary && (
        <BigBrotherJuryCenter leagueId={leagueId} summary={summary} />
      )}

      {view === 'commissioner' && isCommissioner && (
        <BigBrotherCommissionerPanel leagueId={leagueId} onAction={load} />
      )}

      {view === 'commissioner' && !isCommissioner && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
          Commissioner only.
        </div>
      )}
    </div>
  )
}

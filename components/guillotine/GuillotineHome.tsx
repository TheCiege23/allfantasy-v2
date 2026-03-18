'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Shield,
  Skull,
  MessageSquare,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react'
import { GuillotineChopAnimation } from './GuillotineChopAnimation'
import { GuillotineAIPanel } from './GuillotineAIPanel'

const GUILLOTINE_IMAGE = '/guillotine/Guillotine.png'

type Summary = {
  leagueId: string
  weekOrPeriod: number
  choppedThisWeek: { rosterId: string; displayName?: string }[]
  survivalStandings: { rosterId: string; displayName?: string; rank: number; seasonPointsCumul: number }[]
  dangerTiers?: { rosterId: string; displayName?: string; tier: string; pointsFromChopZone: number }[]
  recentChopEvents: { weekOrPeriod: number; choppedRosterIds: string[] }[]
  assets: { leagueImage: string; introVideo: string }
  config?: {
    eliminationStartWeek: number
    eliminationEndWeek: number | null
    teamsPerChop: number
    tiebreakerOrder: string[]
    dangerMarginPoints: number | null
    rosterReleaseTiming: string
  } | null
}

export interface GuillotineHomeProps {
  leagueId: string
}

export function GuillotineHome({ leagueId }: GuillotineHomeProps) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replayChop, setReplayChop] = useState<{ play: boolean; name?: string }>({ play: false })
  const [week, setWeek] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/guillotine/summary?week=${week}`,
        { cache: 'no-store' }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `Error ${res.status}`)
        setSummary(null)
        return
      }
      const data = await res.json()
      setSummary(data)
    } catch {
      setError('Failed to load guillotine summary')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [leagueId, week])

  useEffect(() => {
    load()
  }, [load])

  const chopZone = summary?.dangerTiers?.filter((d) => d.tier === 'chop_zone') ?? []
  const dangerTier = summary?.dangerTiers?.filter((d) => d.tier === 'danger') ?? []
  const safeTier = summary?.dangerTiers?.filter((d) => d.tier === 'safe') ?? []

  if (loading && !summary) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-8">
        <p className="text-sm text-white/60">Loading Guillotine League…</p>
      </div>
    )
  }

  if (error && !summary) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
        <p className="text-sm text-amber-200">{error}</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-2 text-xs text-cyan-400 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <GuillotineChopAnimation
        play={replayChop.play}
        displayName={replayChop.name}
        onComplete={() => setReplayChop({ play: false })}
      />

      {/* Branding header */}
      <header className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <img
          src={GUILLOTINE_IMAGE}
          alt="Guillotine League"
          className="h-16 w-16 rounded-xl object-cover sm:h-20 sm:w-20"
        />
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Guillotine League</h1>
          <p className="text-sm text-white/60">Survival standings · Chop Zone · Danger tier</p>
        </div>
      </header>

      {/* Quick links: Chat, Settings, AI, Waivers */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/app/league/${leagueId}?tab=Chat`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
        >
          <MessageSquare className="h-4 w-4" /> Chat
        </Link>
        <Link
          href={`/app/league/${leagueId}?tab=Settings`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
        >
          <Settings className="h-4 w-4" /> Settings
        </Link>
        <Link
          href={`/app/league/${leagueId}?tab=Intelligence`}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-950/50"
        >
          <Sparkles className="h-4 w-4" /> AI Tools
        </Link>
        <Link
          href={`/app/league/${leagueId}?tab=Waivers`}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-2 text-sm text-amber-200 hover:bg-amber-950/50"
        >
          <Zap className="h-4 w-4" /> Waivers
        </Link>
      </div>

      {/* Survival Board */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Shield className="h-5 w-5 text-cyan-400" />
          Survival Board
        </h2>
        <p className="mb-3 text-xs text-white/50">Week {summary?.weekOrPeriod ?? week} · Lowest projected = Chop Zone</p>
        <div className="space-y-3">
          {chopZone.length > 0 && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-300">Chop Zone</p>
              <ul className="space-y-1">
                {chopZone.map((c) => (
                  <li key={c.rosterId} className="text-sm font-medium text-white/90">
                    {c.displayName ?? c.rosterId} · {c.pointsFromChopZone.toFixed(1)} pts from safety
                  </li>
                ))}
              </ul>
            </div>
          )}
          {dangerTier.length > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300">Danger</p>
              <ul className="space-y-1">
                {dangerTier.map((d) => (
                  <li key={d.rosterId} className="text-sm text-white/80">
                    {d.displayName ?? d.rosterId} · +{d.pointsFromChopZone.toFixed(1)} pts
                  </li>
                ))}
              </ul>
            </div>
          )}
          {safeTier.length > 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">Safe</p>
              <ul className="space-y-1">
                {safeTier.slice(0, 8).map((s) => (
                  <li key={s.rosterId} className="text-sm text-white/70">
                    {s.displayName ?? s.rosterId}
                  </li>
                ))}
                {safeTier.length > 8 && (
                  <li className="text-xs text-white/50">+{safeTier.length - 8} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-xs text-white/50">Survival standings (by season points)</p>
          <ol className="mt-2 space-y-1">
            {(summary?.survivalStandings ?? []).slice(0, 12).map((s) => (
              <li key={s.rosterId} className="flex items-center justify-between text-sm">
                <span className="text-white/80">#{s.rank} {s.displayName ?? s.rosterId}</span>
                <span className="tabular-nums text-white/60">{s.seasonPointsCumul.toFixed(1)} pts</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Chopped History */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Skull className="h-5 w-5 text-rose-400" />
          Chopped History
        </h2>
        {!summary?.recentChopEvents?.length ? (
          <p className="text-sm text-white/50">No eliminations yet.</p>
        ) : (
          <ul className="space-y-2">
            {summary.recentChopEvents.map((ev) => (
              <li
                key={`${ev.weekOrPeriod}-${ev.choppedRosterIds.join(',')}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
              >
                <span className="text-sm text-white/80">Week {ev.weekOrPeriod}</span>
                <span className="text-sm text-white/60">
                  {ev.choppedRosterIds.length} team(s) chopped
                </span>
                <button
                  type="button"
                  onClick={() => setReplayChop({ play: true, name: `Week ${ev.weekOrPeriod}` })}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Replay animation
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Waiver Fallout / Next release */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Zap className="h-5 w-5 text-amber-400" />
          Waiver & FAAB
        </h2>
        <p className="text-sm text-white/70">
          Released players from chopped rosters enter the waiver pool. Next processing per league settings.
        </p>
        {summary?.config?.rosterReleaseTiming && (
          <p className="mt-2 text-xs text-white/50">
            Release timing: {summary.config.rosterReleaseTiming.replace(/_/g, ' ')}
          </p>
        )}
        <Link
          href={`/app/league/${leagueId}?tab=Waivers`}
          className="mt-3 inline-block text-sm text-cyan-400 hover:underline"
        >
          Open Waivers →
        </Link>
      </section>

      {/* Guillotine AI Panel: deterministic data first, then gated AI strategy */}
      <GuillotineAIPanel
        leagueId={leagueId}
        weekOrPeriod={summary?.weekOrPeriod ?? week}
        deterministicSummary={
          summary
            ? {
                survivalStandings: summary.survivalStandings,
                dangerTiers: summary.dangerTiers,
                choppedThisWeek: summary.choppedThisWeek,
                recentChopEvents: summary.recentChopEvents,
              }
            : null
        }
        defaultType="survival"
      />
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <Link
          href={`/app/league/${leagueId}?tab=Intelligence`}
          className="text-sm text-cyan-400 hover:underline"
        >
          More AI tools (Intelligence tab) →
        </Link>
      </section>

      {/* Settings / Rules */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Settings className="h-5 w-5 text-white/60" />
          Rules & Settings
        </h2>
        {summary?.config ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-white/50">Elimination start</dt><dd className="text-white/80">Week {summary.config.eliminationStartWeek}</dd></div>
            <div><dt className="text-white/50">Elimination end</dt><dd className="text-white/80">{summary.config.eliminationEndWeek ?? '—'}</dd></div>
            <div><dt className="text-white/50">Teams per chop</dt><dd className="text-white/80">{summary.config.teamsPerChop}</dd></div>
            <div><dt className="text-white/50">Danger margin</dt><dd className="text-white/80">{summary.config.dangerMarginPoints ?? '—'} pts</dd></div>
            <div><dt className="text-white/50">Tiebreakers</dt><dd className="text-white/80">{summary.config.tiebreakerOrder?.join(' → ') ?? '—'}</dd></div>
          </dl>
        ) : (
          <p className="text-sm text-white/50">No config loaded.</p>
        )}
        <Link
          href={`/app/league/${leagueId}?tab=Settings`}
          className="mt-3 inline-block text-sm text-cyan-400 hover:underline"
        >
          League Settings
        </Link>
      </section>
    </div>
  )
}

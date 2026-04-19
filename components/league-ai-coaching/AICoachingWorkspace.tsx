'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LeagueTeam } from '@prisma/client'
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Compass,
  Gem,
  LayoutDashboard,
  MessageCircle,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from 'lucide-react'
import type { UserLeague } from '@/app/dashboard/types'
import { getChimmyChatHrefWithPrompt } from '@/lib/ai-product-layer/UnifiedChimmyEntryResolver'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type {
  LongTermCoachingAnalysis,
  LongTermCoachingHorizonYears,
  LongTermStrategyClass,
  LongTermStrategyMode,
} from '@/lib/long-term-coaching/types'
import { cn } from '@/lib/utils'

type CoachingSubTab = 'overview' | 'window' | 'plan' | 'assets' | 'moves' | 'chat'

const HORIZONS: LongTermCoachingHorizonYears[] = [2, 3, 4, 5]

const STRATEGY_MODES: { id: LongTermStrategyMode; label: string }[] = [
  { id: 'auto', label: 'Auto / balanced' },
  { id: 'compete_now', label: 'Compete now' },
  { id: 'soft_rebuild', label: 'Soft rebuild' },
  { id: 'full_rebuild', label: 'Full rebuild' },
]

function humanizeStrategyClass(sc: LongTermStrategyClass): string {
  const map: Partial<Record<LongTermStrategyClass, string>> = {
    elite_contender: 'Elite contender',
    contender: 'Contender',
    fringe_contender: 'Fringe',
    pretender: 'Pretender',
    competitive_retool: 'Re-tool',
    soft_rebuild: 'Soft rebuild',
    full_rebuild: 'Rebuild',
    future_core_asset_build: 'Future core',
    developmental_contender: 'Developmental contender',
    win_now_with_risk: 'Win-now (risk)',
    long_term_rise: 'Long-term rise',
  }
  return map[sc] ?? sc.replace(/_/g, ' ')
}

function strategyBadgeTone(sc: LongTermStrategyClass): string {
  if (sc === 'elite_contender' || sc === 'contender') return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
  if (sc === 'fringe_contender' || sc === 'pretender') return 'border-sky-500/35 bg-sky-500/10 text-sky-200'
  if (sc === 'competitive_retool' || sc === 'win_now_with_risk') return 'border-amber-500/35 bg-amber-500/10 text-amber-200'
  if (sc === 'soft_rebuild' || sc === 'full_rebuild') return 'border-rose-500/35 bg-rose-500/10 text-rose-200'
  if (sc === 'future_core_asset_build' || sc === 'developmental_contender' || sc === 'long_term_rise')
    return 'border-violet-500/35 bg-violet-500/10 text-violet-200'
  return 'border-white/15 bg-white/[0.06] text-white/80'
}

function formatBadge(league: LongTermCoachingAnalysis['leagueContext']): string {
  const f = league.flags
  if (f.isDevy && f.isC2C) return 'Devy · C2C'
  if (f.isDevy) return 'Devy'
  if (f.isC2C) return 'C2C'
  if (f.isDynasty) return 'Dynasty'
  if (f.isKeeper) return 'Keeper'
  return 'Redraft'
}

function trajectoryLabel(rows: { y: number; v: number }[]): 'rising' | 'peak_now' | 'stable' | 'declining' | 'rebuilding' {
  if (rows.length < 2) return 'stable'
  const first = rows[0]?.v ?? 0
  const last = rows[rows.length - 1]?.v ?? 0
  const mid = rows[Math.floor(rows.length / 2)]?.v ?? 0
  if (last > first + 6) return 'rising'
  if (first > last + 6) return 'declining'
  if (mid > first && mid > last) return 'peak_now'
  if (last < 42 && first < 48) return 'rebuilding'
  return 'stable'
}

export function AICoachingWorkspace({
  league,
  userTeam,
  sport,
}: {
  league: UserLeague
  userTeam: LeagueTeam | null
  sport: string
}) {
  const [subTab, setSubTab] = useState<CoachingSubTab>('overview')
  const [horizon, setHorizon] = useState<LongTermCoachingHorizonYears>(3)
  const [mode, setMode] = useState<LongTermStrategyMode>('auto')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<LongTermCoachingAnalysis | null>(null)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({})

  const resolvedSport = normalizeToSupportedSport(sport ?? league.sport) ?? 'NFL'
  /** Backend sets `formatWarning` when league is not dynasty/keeper/devy/C2C — redraft-style coaching. */
  const isRedraftStyle = Boolean(analysis?.formatWarning)

  const runFetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const hz: LongTermCoachingHorizonYears =
        analysis?.formatWarning ? ((horizon <= 2 ? horizon : 2) as LongTermCoachingHorizonYears) : horizon
      const res = await fetch('/api/ai-tools/long-term-coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: league.id,
          horizonYears: hz,
          strategyMode: mode,
          teamExternalId: null,
          skipAi: false,
        }),
      })
      const json = (await res.json()) as
        | { ok: true; analysis: LongTermCoachingAnalysis; aiNarrative?: string | null }
        | { ok: false; error?: string; code?: string }
      if (!res.ok || !('ok' in json) || !json.ok || !json.analysis) {
        setAnalysis(null)
        setNarrative(null)
        setError(
          typeof json === 'object' && json && 'error' in json && typeof json.error === 'string'
            ? json.error
            : 'Coaching data could not be loaded.',
        )
        return
      }
      setAnalysis(json.analysis)
      setNarrative(json.aiNarrative ?? null)
    } catch {
      setAnalysis(null)
      setNarrative(null)
      setError('Network error — try again.')
    } finally {
      setLoading(false)
    }
  }, [league.id, horizon, mode, analysis?.formatWarning])

  useEffect(() => {
    void runFetch()
  }, [runFetch])

  const strengthRows = useMemo(() => {
    if (!analysis) return []
    return Object.entries(analysis.futureStrengthByYear)
      .map(([y, v]) => ({ y: Number(y), v }))
      .filter((r) => Number.isFinite(r.y))
      .sort((a, b) => a.y - b.y)
  }, [analysis])

  const traj = trajectoryLabel(strengthRows)

  const strengthsBullets = useMemo(() => {
    if (!analysis) return []
    const out: string[] = []
    const pos = [...analysis.signals.positionalStrength].sort((a, b) => b.starterProjectionSum - a.starterProjectionSum)
    if (pos[0]) out.push(`Strongest position group: ${pos[0].position} (starter projection sum ≈ ${pos[0].starterProjectionSum.toFixed(1)}).`)
    if (analysis.signals.pickCapitalScore >= 55) out.push('Solid future pick capital vs league baseline.')
    if (analysis.signals.prospectPipelineIndex >= 52) out.push('Prospect / pipeline index is a relative strength.')
    if (analysis.pointsForPercentile != null && analysis.pointsForPercentile >= 58) out.push(`Points-for percentile in league: ~${Math.round(analysis.pointsForPercentile)}%.`)
    return out.slice(0, 5)
  }, [analysis])

  const risksBullets = useMemo(() => {
    if (!analysis) return []
    const out = [...analysis.plan.keyRisks]
    if (analysis.signals.ageCurveRisk >= 55) out.unshift(`Age-curve risk is elevated (${Math.round(analysis.signals.ageCurveRisk)}/100).`)
    if (analysis.signals.dynastyValueCoverageRatio < 0.4) out.push('Dynasty value coverage is partial — long-term reads are noisier.')
    return out.slice(0, 6)
  }, [analysis])

  const chimmyBase = useMemo(
    () => ({
      leagueId: league.id,
      leagueName: league.name,
      sport: resolvedSport,
      source: 'long_term_coaching' as const,
    }),
    [league.id, league.name, resolvedSport],
  )

  const quickPrompts = useMemo(
    () => [
      'Am I a real contender in this league?',
      'Should I rebuild now given my roster and picks?',
      `What should I prioritize over the next ${horizon} years?`,
      'Who should I look to trade first?',
      'Which draft picks matter most for my window?',
      'What is my championship window based on the data you see?',
    ],
    [horizon],
  )

  const teamInitials = (userTeam?.teamName ?? 'TM').slice(0, 2).toUpperCase()

  return (
    <div className="space-y-6 pb-10">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#0a1228] via-[#070d18] to-[#050814] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_rgba(0,0,0,0.45)] md:p-7"
        data-testid="ai-coaching-hero"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />

        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_minmax(0,0.9fr)] lg:items-start">
          <div className="flex flex-wrap items-start gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1526] shadow-inner">
              {userTeam?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external Sleeper/CDN avatars
                <img src={userTeam.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-bold text-cyan-200/90">{teamInitials}</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">{userTeam?.teamName ?? 'Your team'}</h1>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">
                  {resolvedSport}
                </span>
                {analysis ? (
                  <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-100/90">
                    {formatBadge(analysis.leagueContext)}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-white/50">{league.name}</p>
              {loading ? (
                <p className="mt-3 text-sm text-cyan-200/60">Syncing coaching intelligence…</p>
              ) : analysis ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                      strategyBadgeTone(analysis.signals.strategyClass),
                    )}
                  >
                    {humanizeStrategyClass(analysis.signals.strategyClass)}
                  </span>
                  <span className="text-[11px] text-white/40">
                    Updated {new Date(analysis.computedAt).toLocaleString()}
                  </span>
                </div>
              ) : null}
              {!loading && analysis ? (
                <p className="mt-3 max-w-prose text-[13px] leading-relaxed text-white/70">
                  {narrative?.split('\n')[0]?.trim() || analysis.plan.currentWindowAssessment}
                </p>
              ) : null}
              {analysis?.formatWarning ? (
                <p className="mt-2 flex items-start gap-2 text-[12px] text-amber-200/85">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {analysis.formatWarning}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-black/25 p-4 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Controls</p>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase text-white/40">Horizon</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(isRedraftStyle ? ([2] as const) : HORIZONS).map((h) => (
                    <button
                      key={h}
                      type="button"
                      disabled={isRedraftStyle}
                      onClick={() => setHorizon(h)}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition',
                        horizon === h
                          ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-100'
                          : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20',
                        isRedraftStyle && 'opacity-80',
                      )}
                    >
                      {h} yr{h > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
                {isRedraftStyle ? (
                  <p className="mt-1 text-[10px] text-white/40">Redraft: short-term horizon only.</p>
                ) : null}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-white/40">Strategy mode</p>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as LongTermStrategyMode)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0a1220] px-2 py-2 text-[12px] text-white"
                >
                  {STRATEGY_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-white/65">
                  <Sparkles className="h-3 w-3 text-violet-300" aria-hidden />
                  Confidence {analysis ? `${Math.round(analysis.plan.confidence * 100)}%` : '—'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100/90">
                  <Target className="h-3 w-3" aria-hidden />
                  Title window ≈ {analysis?.signals.titleWindowYears ?? '—'} yr
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-100/85">
                  <CalendarRange className="h-3 w-3" aria-hidden />
                  Peak yr {analysis?.signals.peakYear ?? '—'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void runFetch()}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/35 bg-cyan-500/10 py-2 text-[12px] font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:opacity-50"
              >
                <Zap className="h-3.5 w-3.5" aria-hidden />
                {loading ? 'Refreshing…' : 'Refresh analysis'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-100/90">{error}</div>
      ) : null}

      {/* Sub-tabs */}
      <div className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-[#060a14]/95 p-1 backdrop-blur-md md:flex-wrap">
        {(
          [
            { id: 'overview' as const, label: 'Overview', Icon: LayoutDashboard },
            { id: 'window' as const, label: 'Team Window', Icon: Compass },
            { id: 'plan' as const, label: 'Year-by-Year', Icon: CalendarRange },
            { id: 'assets' as const, label: 'Assets', Icon: Gem },
            { id: 'moves' as const, label: 'Moves', Icon: Wrench },
            { id: 'chat' as const, label: 'AI Chat', Icon: MessageCircle },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition',
              subTab === id
                ? 'bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                : 'text-white/45 hover:bg-white/[0.05] hover:text-white/75',
            )}
          >
            <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {loading && !analysis ? (
        <div className="rounded-2xl border border-white/[0.07] bg-[#070d18] p-12 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
          <p className="mt-4 text-sm text-white/55">Loading league-aware coaching…</p>
        </div>
      ) : null}

      {!loading && analysis && subTab === 'overview' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-[#070d18] p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-white">Team trajectory</h2>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-white/50">
                {traj.replace('_', ' ')}
              </span>
            </div>
            <div className="mt-4 flex h-36 items-end gap-2">
              {strengthRows.map((r) => (
                <div key={r.y} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-cyan-500/25 to-violet-500/40"
                    style={{ height: `${Math.max(8, (r.v / 100) * 120)}px` }}
                    title={`${r.y}: ${r.v.toFixed(0)}`}
                  />
                  <span className="text-[9px] font-medium text-white/45">{r.y}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-white/45">
              Indices are aggregate strength estimates from live projections and roster signals — not guaranteed outcomes.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#070d18] p-5">
            <h2 className="text-sm font-bold text-white">Core strategy</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-white/70">{analysis.plan.currentWindowAssessment}</p>
            <ul className="mt-3 space-y-2">
              {analysis.plan.topPriorities.slice(0, 5).map((p, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-white/65">
                  <span className="font-mono text-[10px] text-cyan-400/80">{i + 1}.</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-100/95">
              <TrendingUp className="h-4 w-4" aria-hidden />
              Strengths
            </h2>
            <ul className="mt-3 space-y-2 text-[12px] text-emerald-100/75">
              {strengthsBullets.length ? (
                strengthsBullets.map((s, i) => (
                  <li key={i} className="leading-snug">
                    {s}
                  </li>
                ))
              ) : (
                <li className="text-white/45">No standout strengths detected from current data — check Assets tab.</li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.05] p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-rose-100/95">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              Risks
            </h2>
            <ul className="mt-3 space-y-2 text-[12px] text-rose-100/75">
              {risksBullets.map((s, i) => (
                <li key={i} className="leading-snug">
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.07] p-5 lg:col-span-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-violet-100">
              <Sparkles className="h-4 w-4" aria-hidden />
              AI recommendation
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <p className="text-[10px] font-bold uppercase text-white/40">Direction</p>
                <p className="mt-1 text-[13px] font-semibold text-white">{analysis.plan.recommendedDirection.replace(/_/g, ' ')}</p>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <p className="text-[10px] font-bold uppercase text-white/40">Biggest opportunity</p>
                <p className="mt-1 text-[13px] text-white/75">{analysis.plan.topPriorities[0] ?? '—'}</p>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <p className="text-[10px] font-bold uppercase text-white/40">Biggest danger</p>
                <p className="mt-1 text-[13px] text-white/75">{analysis.plan.keyRisks[0] ?? '—'}</p>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <p className="text-[10px] font-bold uppercase text-white/40">Next move</p>
                <p className="mt-1 text-[13px] text-white/75">{analysis.plan.topPriorities[1] ?? analysis.plan.pickStrategy[0] ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && analysis && subTab === 'window' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#070d18] p-5">
            <h2 className="text-sm font-bold text-white">Championship window</h2>
            <p className="mt-1 text-[11px] text-white/45">Phases are illustrative bands tied to your strength indices — not fixed calendar guarantees.</p>
            <div className="mt-6 grid gap-2 md:grid-cols-5">
              {['Rise', 'Peak', 'Stability', 'Decline risk', 'Retool / rebuild'].map((phase, i) => (
                <div
                  key={phase}
                  className={cn(
                    'rounded-xl border px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wide',
                    i === 1
                      ? 'border-amber-400/35 bg-amber-500/10 text-amber-100'
                      : 'border-white/[0.07] bg-white/[0.03] text-white/55',
                  )}
                >
                  {phase}
                </div>
              ))}
            </div>
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500/50 via-amber-400/60 to-rose-500/40"
                style={{ width: `${Math.min(100, analysis.signals.shortTermStrengthIndex)}%` }}
              />
            </div>
            <p className="mt-3 text-[12px] text-white/55">
              Short-term strength {Math.round(analysis.signals.shortTermStrengthIndex)}/100 · Long-term assets{' '}
              {Math.round(analysis.signals.longTermAssetIndex)}/100 · Decline risk: {analysis.signals.declineRisk}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Age curve risk', value: `${Math.round(analysis.signals.ageCurveRisk)}/100`, tone: 'text-amber-200' },
              { label: 'Prospect pipeline', value: `${Math.round(analysis.signals.prospectPipelineIndex)}/100`, tone: 'text-violet-200' },
              { label: 'Pick capital', value: `${Math.round(analysis.signals.pickCapitalScore)}/100`, tone: 'text-cyan-200' },
              { label: 'PF percentile', value: analysis.pointsForPercentile != null ? `~${Math.round(analysis.pointsForPercentile)}%` : '—', tone: 'text-emerald-200' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-white/[0.07] bg-[#070d18] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">{c.label}</p>
                <p className={cn('mt-2 text-xl font-bold tabular-nums', c.tone)}>{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && analysis && subTab === 'plan' ? (
        <div className="space-y-3">
          {analysis.yearOutlooks.map((yo) => {
            const open = expandedYears[yo.labelYear] ?? yo.labelYear === new Date().getFullYear() + 1
            const focus = analysis.plan.yearByYearFocus.find((f) => f.year === yo.labelYear)
            return (
              <div key={yo.labelYear} className="rounded-2xl border border-white/[0.08] bg-[#070d18]">
                <button
                  type="button"
                  onClick={() => setExpandedYears((m) => ({ ...m, [yo.labelYear]: !open }))}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{yo.labelYear}</p>
                    <p className="text-[11px] text-white/45">
                      Strength index {Math.round(yo.projectedTeamStrengthIndex)} · {yo.contentionBand} contention
                    </p>
                  </div>
                  {open ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronRight className="h-4 w-4 text-white/40" />}
                </button>
                {open ? (
                  <div className="space-y-2 border-t border-white/[0.06] px-4 py-3 text-[12px] text-white/70">
                    {focus ? <p className="font-medium text-white/85">Focus: {focus.focus}</p> : null}
                    <ul className="list-disc space-y-1 pl-5 text-white/60">
                      {yo.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}

      {!loading && analysis && subTab === 'assets' ? (
        <div className="space-y-4">
          {[
            { title: 'Build around', rows: analysis.plan.playersToBuildAround, accent: 'border-cyan-500/20 bg-cyan-500/[0.05]' },
            { title: 'Hold', rows: analysis.plan.playersToHold, accent: 'border-emerald-500/20 bg-emerald-500/[0.05]' },
            { title: 'Sell / trim', rows: analysis.plan.playersToSell, accent: 'border-rose-500/20 bg-rose-500/[0.05]' },
          ].map((block) => (
            <div key={block.title} className={cn('rounded-2xl border p-4', block.accent)}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">{block.title}</h3>
              <div className="mt-3 space-y-2">
                {block.rows.length === 0 ? (
                  <p className="text-[12px] text-white/40">No players in this bucket from current signals.</p>
                ) : (
                  block.rows.map((r) => (
                    <div
                      key={r.playerId}
                      className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2"
                    >
                      <div>
                        <p className="text-[13px] font-semibold text-white">{r.name ?? r.playerId}</p>
                        <p className="text-[11px] text-white/50">{r.rationale}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-100/90">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Draft picks
            </h3>
            {analysis.signals.pickSummaries.length === 0 ? (
              <p className="mt-2 text-[12px] text-white/45">No pick rows parsed from roster data — re-sync imports if picks should appear.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {analysis.signals.pickSummaries.map((p, i) => (
                  <li
                    key={`${p.season}-${p.round}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-[12px] text-white/75"
                  >
                    <span>
                      {p.season} · Round {p.round}
                    </span>
                    <span className="font-mono text-[11px] text-amber-200/90">weight {p.weightScore.toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {!loading && analysis && subTab === 'moves' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-5">
            <h2 className="text-sm font-bold text-cyan-100">Top priorities</h2>
            <ol className="mt-3 space-y-3">
              {analysis.plan.topPriorities.slice(0, 5).map((p, i) => (
                <li key={i} className="flex gap-3 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2">
                  <span className="text-lg font-bold text-cyan-400/80">{i + 1}</span>
                  <p className="text-[13px] leading-snug text-white/80">{p}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/[0.08] bg-[#070d18] p-4">
              <h3 className="text-[11px] font-bold uppercase text-white/45">Trade & waivers</h3>
              <ul className="mt-2 space-y-2 text-[12px] text-white/65">
                <li>
                  <Link className="text-cyan-300 hover:underline" href={`/trade-evaluator?leagueId=${encodeURIComponent(league.id)}`}>
                    Open Trade Value
                  </Link>{' '}
                  — structured fairness + roster impact.
                </li>
                <li>
                  <Link className="text-cyan-300 hover:underline" href={`/dashboard?focusLeague=${encodeURIComponent(league.id)}`}>
                    Waiver Wire (dashboard tools)
                  </Link>
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#070d18] p-4">
              <h3 className="text-[11px] font-bold uppercase text-white/45">Draft & War Room</h3>
              <ul className="mt-2 space-y-2 text-[12px] text-white/65">
                <li>
                  <Link className="text-cyan-300 hover:underline" href={`/league/${league.id}?view=draft`}>
                    League Draft tab
                  </Link>
                </li>
                <li>
                  <Link className="text-cyan-300 hover:underline" href="/war-room">
                    AF War Room
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#070d18] p-4">
            <h3 className="text-[11px] font-bold uppercase text-white/45">Rookie / devy notes</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-white/65">
              {analysis.plan.rookieDevyStrategy.length ? (
                analysis.plan.rookieDevyStrategy.map((x, i) => <li key={i}>{x}</li>)
              ) : (
                <li className="text-white/45">No devy-specific notes — format may be redraft or pipeline data thin.</li>
              )}
            </ul>
          </div>
        </div>
      ) : null}

      {!loading && analysis && subTab === 'chat' ? (
        <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] to-[#070d18] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white">League-scoped Chimmy</h2>
              <p className="mt-1 max-w-prose text-[12px] text-white/55">
                Opens private AI chat with this league, team, sport, and your selected horizon ({horizon} yr) / mode ({mode}) pre-contextualized.
              </p>
            </div>
            <Link
              href={getChimmyChatHrefWithPrompt(
                `League: ${league.name}. Horizon ${horizon} years, mode ${mode}. Help me act on my AI Coaching plan.`,
                chimmyBase,
              )}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/90 px-4 py-2 text-[12px] font-bold text-black transition hover:bg-cyan-400"
            >
              Open Chimmy
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickPrompts.map((q) => (
              <Link
                key={q}
                href={getChimmyChatHrefWithPrompt(q, chimmyBase)}
                className="inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] text-white/75 transition hover:border-cyan-500/30 hover:text-white"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

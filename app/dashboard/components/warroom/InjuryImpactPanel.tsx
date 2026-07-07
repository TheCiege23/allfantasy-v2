'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, HeartPulse, ShieldCheck } from 'lucide-react'
import type { UserLeague } from '../../types'
import type { InjuryImpactDashboardResult, InjuryPlayerIntelRow } from '@/lib/injury-impact-dashboard/types'
import { WarRoomCard } from './WarRoomCard'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

/** Concerning severities worth surfacing for a starter (probable/other are noise for this panel). */
const CONCERN = new Set(['out', 'ir', 'doubtful', 'questionable', 'gtd', 'suspended'])

const SEVERITY_STYLE: Record<string, string> = {
  out: 'bg-red-500/15 text-red-300',
  ir: 'bg-red-500/15 text-red-300',
  suspended: 'bg-red-500/15 text-red-300',
  doubtful: 'bg-orange-500/15 text-orange-300',
  questionable: 'bg-amber-500/15 text-amber-300',
  gtd: 'bg-amber-500/15 text-amber-300',
  probable: 'bg-white/[0.06] text-white/50',
  other: 'bg-white/[0.06] text-white/50',
}

function SummaryChip({ label, count, tone }: { label: string; count: number; tone: string }) {
  if (count <= 0) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>
      <span className="tabular-nums">{count}</span>
      <span className="uppercase tracking-wide opacity-80">{label}</span>
    </span>
  )
}

/**
 * Dashboard V2 Phase 3.2 — Injury Impact (Monitor + Explain). Adapts the existing injury-impact
 * engine (POST /api/ai-tools/injury-impact/dashboard, the same source InjuryImpactMiniCard uses) into
 * a Team-context panel: severity chips from the real summary counts, and the most impactful affected
 * starters with a real impact bar and their real status/news as the "why". No gauges, no fabricated
 * numbers — every value comes from the engine; honest empty/degraded states where data is missing.
 */
export function InjuryImpactPanel({ league }: { league: UserLeague }) {
  const { t, tInterpolate } = useLanguage()
  const [data, setData] = useState<InjuryImpactDashboardResult | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)
    const sport = league.sport ? String(league.sport).toUpperCase() : 'ALL'
    void fetch('/api/ai-tools/injury-impact/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sportFilter: sport,
        leagueId: league.id,
        teamContext: 'my_team',
        statusFilter: 'all',
        timeHorizon: 'this_week',
        skipAi: true,
        toggles: {
          includePractice: true,
          includeNews: true,
          includeReturnTimelines: true,
          includeHandcuffs: false,
          includePlayoffImpact: false,
          includeDynastyImpact: false,
        },
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: InjuryImpactDashboardResult | { ok: false } | null) => {
        if (cancelled) return
        setData(json && (json as InjuryImpactDashboardResult).ok ? (json as InjuryImpactDashboardResult) : null)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [league.id, league.sport])

  const affectedStarters = useMemo<InjuryPlayerIntelRow[]>(() => {
    if (!data) return []
    return data.players
      .filter((p) => p.isStarter && CONCERN.has(p.severity))
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 5)
  }, [data])

  if (!ready) {
    return (
      <WarRoomCard className="h-[120px] animate-pulse" accentBorder="rgba(248,113,113,0.1)">
        <span className="sr-only">{t('dashboard.warroom.injury.title')}</span>
      </WarRoomCard>
    )
  }

  const counts = data?.summaryCounts
  const anyConcern = counts ? counts.outIr + counts.doubtful + counts.questionable > 0 : false

  return (
    <WarRoomCard className="overflow-hidden" accentBorder="rgba(248,113,113,0.18)">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-red-300/80">
          <HeartPulse className="h-3 w-3" aria-hidden />
          {t('dashboard.warroom.injury.title')}
        </p>
        {counts ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <SummaryChip label={t('dashboard.warroom.injury.out')} count={counts.outIr} tone="bg-red-500/15 text-red-300" />
            <SummaryChip label={t('dashboard.warroom.injury.doubtful')} count={counts.doubtful} tone="bg-orange-500/15 text-orange-300" />
            <SummaryChip label={t('dashboard.warroom.injury.questionable')} count={counts.questionable} tone="bg-amber-500/15 text-amber-300" />
          </div>
        ) : null}
      </div>

      {affectedStarters.length > 0 ? (
        <ul>
          {affectedStarters.map((p) => {
            const impact = Math.max(0, Math.min(100, Math.round(p.impactScore)))
            const why = p.injuryNewsSummary || p.freshnessNote || p.statusRaw
            return (
              <li key={p.playerKey} className="border-b border-white/[0.04] px-4 py-2.5 last:border-b-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-[12px] font-semibold text-white/90">
                    {p.name} <span className="text-white/35">· {p.position} · {p.team}</span>
                  </p>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${SEVERITY_STYLE[p.severity] ?? SEVERITY_STYLE.other}`}>
                    {p.statusRaw || p.severity}
                  </span>
                </div>
                {/* Impact bar — real impactScore, not a gauge. */}
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-400"
                      style={{ width: `${impact}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-white/40">
                    {tInterpolate('dashboard.warroom.injury.impact', { n: impact })}
                  </span>
                </div>
                {/* Explain — the real status/news, no fabricated reasoning. */}
                {why ? <p className="mt-1 truncate text-[10px] text-white/40">{why}</p> : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="flex items-center gap-2 px-4 py-4 text-[12px] text-emerald-300/80">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          {anyConcern
            ? t('dashboard.warroom.injury.emptyBench')
            : t('dashboard.warroom.injury.emptyClean')}
        </div>
      )}

      {data?.degraded ? (
        <p className="flex items-center gap-1.5 border-t border-white/[0.04] px-4 py-2 text-[10px] text-white/30">
          <Activity className="h-3 w-3" aria-hidden />
          {t('dashboard.warroom.injury.degraded')}
        </p>
      ) : null}
    </WarRoomCard>
  )
}

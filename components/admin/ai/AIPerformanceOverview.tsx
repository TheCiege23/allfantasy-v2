'use client'

import { Activity, CheckCircle2, Crosshair, Percent, Sparkles, TrendingUp } from 'lucide-react'
import type { AdminAIMetricsBundle } from '@/lib/ai/admin/getAIMetrics'

export function AIPerformanceOverview({ global }: { global: AdminAIMetricsBundle['global'] }) {
  const cards = [
    {
      label: 'Recommendations served',
      value: global.totalRecommendationsServed.toLocaleString(),
      hint: 'Logs + platform “served” events (deduped view)',
      icon: Activity,
      tone: 'text-cyan-300',
    },
    {
      label: 'Followed / accepted',
      value: global.totalRecommendationsFollowed.toLocaleString(),
      hint: 'Outcomes + log acceptances',
      icon: CheckCircle2,
      tone: 'text-emerald-300',
    },
    {
      label: 'Follow rate',
      value: global.followRatePct != null ? `${global.followRatePct.toFixed(1)}%` : '—',
      hint: 'Where follow/ignore is known',
      icon: Percent,
      tone: 'text-violet-300',
    },
    {
      label: 'Avg outcome score',
      value: global.avgOutcomeScore != null ? global.avgOutcomeScore.toFixed(3) : '—',
      hint: 'Resolved outcomes only',
      icon: Crosshair,
      tone: 'text-amber-300',
    },
    {
      label: 'Accuracy proxy',
      value: global.accuracyScorePct != null ? `${global.accuracyScorePct.toFixed(1)}%` : '—',
      hint: 'Share of outcomes ≥ 0.5',
      icon: Sparkles,
      tone: 'text-fuchsia-300',
    },
    {
      label: '7d vs 30d Δ follow',
      value:
        global.trend7dVs30d.followRateDeltaPct != null
          ? `${global.trend7dVs30d.followRateDeltaPct >= 0 ? '+' : ''}${global.trend7dVs30d.followRateDeltaPct.toFixed(2)}pp`
          : '—',
      hint: 'Rolling windows inside your date range',
      icon: TrendingUp,
      tone: 'text-sky-300',
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">{c.label}</p>
              <p className={`mt-2 text-2xl font-bold tabular-nums ${c.tone}`}>{c.value}</p>
              <p className="mt-1 text-[11px] text-white/40">{c.hint}</p>
            </div>
            <c.icon className={`h-5 w-5 shrink-0 opacity-60 ${c.tone}`} aria-hidden />
          </div>
        </div>
      ))}
    </div>
  )
}

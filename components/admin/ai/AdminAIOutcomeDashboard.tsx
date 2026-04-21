'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { AIDashboardFilters, type DashboardFilterState } from '@/components/admin/ai/AIDashboardFilters'
import { AIFeatureBreakdown } from '@/components/admin/ai/AIFeatureBreakdown'
import { AIFollowAnalysis } from '@/components/admin/ai/AIFollowAnalysis'
import { AILeagueSegments } from '@/components/admin/ai/AILeagueSegments'
import { AIOutcomeDistribution } from '@/components/admin/ai/AIOutcomeDistribution'
import { AIPerformanceOverview } from '@/components/admin/ai/AIPerformanceOverview'
import { AIPlayerPerformanceTable } from '@/components/admin/ai/AIPlayerPerformanceTable'
import { AIRecommendationTable } from '@/components/admin/ai/AIRecommendationTable'
import { AITimeSeriesChart } from '@/components/admin/ai/AITimeSeriesChart'
import { AIUserSegments } from '@/components/admin/ai/AIUserSegments'
import type { AdminAIMetricsBundle } from '@/lib/ai/admin/getAIMetrics'

function defaultFilters(): DashboardFilterState {
  const to = new Date()
  const from = new Date(to.getTime() - 30 * 86400000)
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
    sport: 'all',
    leagueType: 'all',
    feature: 'all',
    userSegment: 'all',
    timeRange: '30d',
  }
}

function buildMetricsQuery(f: DashboardFilterState) {
  const p = new URLSearchParams({
    dateFrom: f.dateFrom,
    dateTo: f.dateTo,
    sport: f.sport,
    leagueType: f.leagueType,
    feature: f.feature,
    userSegment: f.userSegment,
    timeRange: f.timeRange,
  })
  return p.toString()
}

export function AdminAIOutcomeDashboard() {
  const [filters, setFilters] = useState<DashboardFilterState>(defaultFilters)
  const [data, setData] = useState<AdminAIMetricsBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/ai/metrics?${buildMetricsQuery(filters)}`)
      const json = (await res.json()) as { ok?: boolean; data?: AdminAIMetricsBundle; error?: string }
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error || 'Failed to load metrics')
        setData(null)
        return
      }
      setData(json.data)
    } catch {
      setError('Network error')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">AI outcome analytics</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/55">
            Internal view of recommendation volume, follow behavior, and resolved outcomes. Uses{' '}
            <code className="rounded bg-white/10 px-1 text-[12px]">ai_platform_events</code>,{' '}
            <code className="rounded bg-white/10 px-1 text-[12px]">ai_recommendation_outcomes</code>,{' '}
            <code className="rounded bg-white/10 px-1 text-[12px]">ai_recommendation_logs</code>, and tendency tables.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          Refresh
        </button>
      </div>

      <AIDashboardFilters value={filters} onChange={setFilters} />

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-12 text-center text-white/50">
          Loading AI metrics…
        </div>
      ) : null}

      {data ? (
        <>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/45">Global performance</h3>
            <AIPerformanceOverview global={data.global} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/45">Feature breakdown</h3>
              <AIFeatureBreakdown rows={data.featureBreakdown} />
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/45">Outcome distribution</h3>
              <AIOutcomeDistribution buckets={data.outcomeDistribution} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/45">Follow vs ignore</h3>
            <AIFollowAnalysis data={data.followVsIgnore} />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/45">Time series</h3>
            <AITimeSeriesChart series={data.timeSeries} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/45">User trust segments</h3>
              <AIUserSegments rows={data.userSegments} />
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/45">Player signals</h3>
              <AIPlayerPerformanceTable rows={data.playerPerformance} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/45">League segments</h3>
            <AILeagueSegments rows={data.leagueSegments} />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/45">Recommendation log</h3>
            <AIRecommendationTable filters={filters} />
          </section>

          <p className="text-[11px] text-white/35">
            Generated {new Date(data.generatedAt).toLocaleString()} · Filters are applied to aggregates server-side.
          </p>
        </>
      ) : null}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import type { ManagerReplayInsightSetV1, ManagerReplayInsightV1 } from '@/lib/replay-framework/insights/managerReplayInsight'

/**
 * Phase 20 — Manager Replay Insights dashboard card (display-only).
 *
 * A self-contained, read-only card that renders the user-safe
 * `ManagerReplayInsightSetV1` contract for one league. It fetches the INTERNAL,
 * session-authenticated route `/api/leagues/[leagueId]/replay-insights` (the A1
 * path) — never the public keyed Intelligence API, and never the replay
 * internals. It shows historical, validated observations about this league's
 * trades; it does not modify or feed any recommendation logic.
 *
 * States are honest: disabled (feature off → renders nothing), loading, error,
 * empty (not enough trade history yet), and ready. No raw replay/asset IDs are
 * ever rendered — the contract carries none, and this component reads only its
 * user-facing fields.
 *
 * Gated client-side by `NEXT_PUBLIC_MANAGER_REPLAY_INSIGHTS_DASHBOARD_ENABLED`
 * so the card is fully inert by default — no fetch, renders nothing — until the
 * feature is turned on. The internal route independently enforces its own
 * server-side `MANAGER_REPLAY_INSIGHTS_DASHBOARD_ENABLED` gate; both must be on
 * for the card to show, which keeps every dashboard render cost-free when off.
 */

type CardState =
  | { status: 'loading' }
  | { status: 'disabled' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'ready'; data: ManagerReplayInsightSetV1 }

interface CardResponse {
  enabled: boolean
  data?: ManagerReplayInsightSetV1
}

function sentimentClasses(sentiment: ManagerReplayInsightV1['sentiment']): string {
  if (sentiment === 'positive') return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20'
  if (sentiment === 'caution') return 'bg-amber-500/15 text-amber-300 border-amber-400/20'
  return 'bg-white/10 text-white/70 border-white/15'
}

function confidenceLabel(confidence: ManagerReplayInsightV1['confidence']): string {
  if (confidence === 'high') return 'High confidence'
  if (confidence === 'moderate') return 'Moderate confidence'
  if (confidence === 'low') return 'Low confidence'
  return 'Very limited data'
}

function InsightRow({ insight }: { insight: ManagerReplayInsightV1 }) {
  return (
    <li className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-white/90">{insight.headline}</p>
        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold ${sentimentClasses(insight.sentiment)}`}>
          {insight.displayValue}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-white/60">{insight.detail}</p>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-white/40">
        <span>{confidenceLabel(insight.confidence)}</span>
        <span aria-hidden>·</span>
        <span>{insight.sampleSize} trade{insight.sampleSize === 1 ? '' : 's'}</span>
      </div>
      {insight.caveat && (
        <p className="mt-2 rounded-md bg-white/[0.03] px-2 py-1 text-[11px] leading-relaxed text-white/45">
          {insight.caveat}
        </p>
      )}
    </li>
  )
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4" aria-label="Trade impact insights">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-white/90">Trade Impact Insights</h2>
        <span className="text-[11px] text-white/35">Historical · not advice</span>
      </div>
      {children}
    </section>
  )
}

export function ManagerReplayInsightsCard({ leagueId }: { leagueId: string }) {
  const enabledClient = process.env.NEXT_PUBLIC_MANAGER_REPLAY_INSIGHTS_DASHBOARD_ENABLED === 'true'
  const [state, setState] = useState<CardState>(enabledClient ? { status: 'loading' } : { status: 'disabled' })

  useEffect(() => {
    if (!enabledClient) return
    let cancelled = false
    setState({ status: 'loading' })
    fetch(`/api/leagues/${encodeURIComponent(leagueId)}/replay-insights`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`)
        return (await res.json()) as CardResponse
      })
      .then((body) => {
        if (cancelled) return
        if (!body.enabled) {
          setState({ status: 'disabled' })
          return
        }
        if (!body.data || body.data.insights.length === 0) {
          setState({ status: 'empty' })
          return
        }
        setState({ status: 'ready', data: body.data })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [leagueId, enabledClient])

  if (state.status === 'disabled') return null

  if (state.status === 'loading') {
    return (
      <CardShell>
        <div className="space-y-2" role="status" aria-live="polite">
          <span className="sr-only">Loading trade impact insights…</span>
          <div className="h-14 animate-pulse rounded-lg bg-white/5" />
          <div className="h-14 animate-pulse rounded-lg bg-white/5" />
        </div>
      </CardShell>
    )
  }

  if (state.status === 'error') {
    return (
      <CardShell>
        <p className="text-xs text-white/50">Trade impact insights couldn’t be loaded right now.</p>
      </CardShell>
    )
  }

  if (state.status === 'empty') {
    return (
      <CardShell>
        <p className="text-xs text-white/50">Not enough completed-trade history in this league yet to show trade impact insights.</p>
      </CardShell>
    )
  }

  return (
    <CardShell>
      <ul className="space-y-2">
        {state.data.insights.map((insight) => (
          <InsightRow key={insight.insightId} insight={insight} />
        ))}
      </ul>
    </CardShell>
  )
}

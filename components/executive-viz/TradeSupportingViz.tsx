'use client'

/**
 * Fantasy OS Suite — Phase V2.4: Trade OS supporting executive visualizations.
 *
 * Two supporting graphs that reinforce the Trade Opportunity Matrix flagship, each answering one
 * market/decision question, from the same data (LeagueAnalyticsSnapshot + trade-category recommendations):
 *
 *   - MarketActivityCard → "How active is the trade market?"
 *   - TradePipelineCard  → "What should I pursue next?"
 *
 * "Position Demand" (which positions are scarce) is intentionally NOT built — no provider-agnostic
 * position-supply contract exists, and inventing it (or reading raw rosters) is out of scope and
 * player-centric. See EXECUTIVE_VISUALIZATION_ENGINE.md §Phase V2.4 (deferred work).
 */
import { useMemo } from 'react'
import { Activity, ListOrdered, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeagueAnalyticsSnapshot } from '@/lib/decision-os/leagueAnalytics'
import type { Recommendation } from '@/lib/decision-os/phase6/recommendations/types'
import {
  buildTradeMarketActivity,
  buildTradePipeline,
} from '@/lib/executive-viz/tradeMarketViewModel'
import { EXECUTIVE_STATUS_SURFACE } from './executiveVizTokens'
import {
  ExecutiveEmptyState,
  ExecutiveUnavailableState,
  ExecutiveVisualizationShell,
} from './ExecutiveVisualizationShell'

export function MarketActivityCard({ analytics }: { analytics: LeagueAnalyticsSnapshot | null }) {
  const model = useMemo(() => buildTradeMarketActivity(analytics), [analytics])
  const DirIcon = model.direction === 'increasing' ? TrendingUp : model.direction === 'decreasing' ? TrendingDown : Minus
  return (
    <ExecutiveVisualizationShell
      title="Market Activity"
      description="How active the trade market is."
      icon={Activity}
      accessibleSummary={model.headline}
    >
      {!model.available ? (
        <ExecutiveUnavailableState description="Trade market activity appears once this league is connected and synced." />
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <div
            className={cn(
              'flex min-w-[6.5rem] flex-col items-center justify-center rounded-2xl border px-5 py-4 text-center',
              EXECUTIVE_STATUS_SURFACE[model.status],
            )}
          >
            <span className="text-[30px] font-black leading-none">{model.tradeCount}</span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">trades so far</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold capitalize text-primary">{model.activity} market</p>
            <p className="mt-1 text-[12px] leading-snug text-secondary">{model.headline}</p>
            {model.direction ? (
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-muted" title="League activity trend, not a trade-outcome forecast.">
                <DirIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                League activity {model.direction}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </ExecutiveVisualizationShell>
  )
}

export function TradePipelineCard({ recommendations }: { recommendations: Recommendation[] | null }) {
  const model = useMemo(() => buildTradePipeline(recommendations), [recommendations])
  return (
    <ExecutiveVisualizationShell
      title="Trade Pipeline"
      description="What to pursue next, in priority order."
      icon={ListOrdered}
      accessibleSummary={model.headline}
    >
      {model.items.length === 0 ? (
        <ExecutiveEmptyState
          icon={ListOrdered}
          title="No trade moves queued"
          description="No trade recommendations are open for this league right now — the pipeline fills as opportunities are generated."
        />
      ) : (
        <>
          <p className="mb-3 text-[12px] font-semibold text-secondary">{model.headline}</p>
          <ol className="space-y-2">
            {model.items.map((item, index) => (
              <li
                key={item.key}
                data-testid={`trade-step-${item.key}`}
                className="flex items-start gap-3 rounded-xl border border-subtle bg-surface px-3 py-2.5"
              >
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-primary/25 bg-brand-primary/10 text-[12px] font-black text-brand-primary">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-primary">{item.label}</span>
                    <span className={cn('shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase', EXECUTIVE_STATUS_SURFACE[item.status])}>
                      {item.priorityLabel}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-secondary">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </ExecutiveVisualizationShell>
  )
}

'use client'

/**
 * Fantasy OS Suite — Phase V2.2: User (Manager) OS supporting executive visualizations.
 *
 * Three supporting graphs that reinforce the Championship Trajectory flagship, each answering one
 * management decision, all built from the same existing `ManagerCommandCenterSnapshot` — no new fetch,
 * no new intelligence, no player-level records, no provider identifiers.
 *
 *   - WeeklyDecisionTimelineCard → "What should I do first?"
 *   - TeamRiskSummaryCard        → "Where could my season go wrong?"
 *   - DecisionFocusCard          → "Which areas need my attention?"
 *
 * "Playoff Outlook" (probability) and roster "Position Strength" are intentionally NOT built — the
 * manager Decision OS contract carries no such data, and inventing it is forbidden this phase. See
 * EXECUTIVE_VISUALIZATION_ENGINE.md §Phase V2.2 (deferred work).
 */
import { useMemo } from 'react'
import { ListOrdered, ShieldAlert, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ManagerCommandCenterSnapshot } from '@/lib/decision-os/managerCommandCenter'
import {
  buildWeeklyDecisionTimeline,
  buildTeamRiskSummary,
  buildDecisionFocus,
} from '@/lib/executive-viz/managerSeasonViewModel'
import { ExecutiveHorizontalBars } from './ExecutiveCharts'
import { EXECUTIVE_STATUS_SURFACE } from './executiveVizTokens'
import {
  ExecutiveEmptyState,
  ExecutiveUnavailableState,
  ExecutiveVisualizationShell,
} from './ExecutiveVisualizationShell'

export function WeeklyDecisionTimelineCard({ snapshot }: { snapshot: ManagerCommandCenterSnapshot | null }) {
  const model = useMemo(() => buildWeeklyDecisionTimeline(snapshot), [snapshot])
  return (
    <ExecutiveVisualizationShell
      title="Weekly Decision Timeline"
      description="What to do first, in priority order."
      icon={ListOrdered}
      accessibleSummary={model.headline}
    >
      {!model.available ? (
        <ExecutiveUnavailableState description="Your decision timeline appears once a league is connected and synced." />
      ) : model.items.length === 0 ? (
        <ExecutiveEmptyState
          icon={ListOrdered}
          title="Nothing to sequence"
          description="No lineup, waiver, or trade decisions are waiting on you right now."
        />
      ) : (
        <>
          <p className="mb-3 text-[12px] font-semibold text-secondary">{model.headline}</p>
          <ol className="space-y-2">
            {model.items.map((item, index) => (
              <li
                key={item.key}
                data-testid={`decision-step-${item.key}`}
                className="flex items-start gap-3 rounded-xl border border-subtle bg-surface px-3 py-2.5"
              >
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-primary/25 bg-brand-primary/10 text-[12px] font-black text-brand-primary">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-primary">{item.label}</span>
                    <span
                      className={cn(
                        'shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase',
                        EXECUTIVE_STATUS_SURFACE[item.status],
                      )}
                    >
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

export function TeamRiskSummaryCard({ snapshot }: { snapshot: ManagerCommandCenterSnapshot | null }) {
  const model = useMemo(() => buildTeamRiskSummary(snapshot), [snapshot])
  return (
    <ExecutiveVisualizationShell
      title="Team Risk Summary"
      description="Where your season could go wrong."
      icon={ShieldAlert}
      accessibleSummary={model.headline}
    >
      {!model.available ? (
        <ExecutiveUnavailableState description="Team risk appears once a league is connected and synced." />
      ) : (
        <>
          <p className="mb-3 text-[12px] font-semibold text-secondary">{model.headline}</p>
          <ExecutiveHorizontalBars items={model.items} />
        </>
      )}
    </ExecutiveVisualizationShell>
  )
}

export function DecisionFocusCard({ snapshot }: { snapshot: ManagerCommandCenterSnapshot | null }) {
  const model = useMemo(() => buildDecisionFocus(snapshot), [snapshot])
  return (
    <ExecutiveVisualizationShell
      title="Decision Focus"
      description="Which areas need your attention."
      icon={Compass}
      accessibleSummary={model.headline}
    >
      {!model.available ? (
        <ExecutiveUnavailableState description="Decision focus appears once you have active recommendations." />
      ) : model.items.length === 0 ? (
        <ExecutiveEmptyState
          icon={Compass}
          title="No focus areas right now"
          description="No lineup, waiver, or trade recommendations are open across your teams."
        />
      ) : (
        <>
          <p className="mb-3 text-[12px] font-semibold text-secondary">{model.headline}</p>
          <ExecutiveHorizontalBars items={model.items} />
        </>
      )}
    </ExecutiveVisualizationShell>
  )
}

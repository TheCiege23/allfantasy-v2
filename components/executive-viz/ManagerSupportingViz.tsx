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
import type { ManagerCommandCenterSnapshot } from '@/lib/decision-os/managerCommandCenter'
import {
  buildWeeklyDecisionTimeline,
  buildTeamRiskSummary,
  buildDecisionFocus,
} from '@/lib/executive-viz/managerSeasonViewModel'
import { ExecutiveHorizontalBars, ExecutiveDecisionSequence } from './ExecutiveCharts'
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
          {/* Phase V2.5: migrated onto the shared `ExecutiveDecisionSequence` primitive (3 consumers). */}
          <ExecutiveDecisionSequence
            items={model.items.map((item) => ({
              key: item.key,
              label: item.label,
              detail: item.detail,
              badgeLabel: item.priorityLabel,
              status: item.status,
            }))}
            testIdPrefix="decision-step"
          />
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

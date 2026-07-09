'use client'
/**
 * Fantasy OS Suite — Phase OS-C1: Manager Operating System Foundation.
 *
 * The manager-facing mirror of `CommissionerCommandCenterSection.tsx` — "what needs my attention
 * today, across every team I play in?" before drilling into any single league. Self-fetching, same
 * "each card fetches its own Decision OS data" convention every other Decision OS section on this
 * page family already follows.
 *
 * Reuses `TodaysBriefCard`, `CommissionerAttentionQueue`, and `NotificationCenter` completely
 * unchanged — all three already take fully generic props (`DailyBrief`, `DecisionOsAttentionSignal[]`,
 * `DecisionOsNotification[]`, all keyed by `leagueId`/`leagueNameById`, zero commissioner-specific
 * typing or copy). `CommissionerAttentionQueue`'s own name is a pre-existing naming artifact (it
 * predates Manager OS and was never renamed to something more neutral) — reusing it here is
 * intentional, not an oversight; renaming it is a separate, low-risk cleanup this phase deliberately
 * did not take on, to avoid touching a component with existing call sites/tests for a cosmetic
 * reason.
 *
 * Phase OS-C2 added the 3 Priority Modules (Lineup/Trade/Waiver) below the Attention Queue — built on
 * `ManagerCommandCenterSnapshot.recommendations`, the same real Phase 6.4 data the Attention Queue's
 * own `manager_recommendation` signals already read, chosen as the canonical source after an explicit
 * architecture audit (`docs/os/OS_C2_PRIORITIES_ARCHITECTURE_AUDIT.md`) ruled out 2 other candidate
 * systems.
 */
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Compass, ListChecks, Repeat, ShoppingCart } from 'lucide-react'
import type { ManagerCommandCenterSnapshot } from '@/lib/decision-os/managerCommandCenter'
import { composeDailyBrief } from '@/lib/decision-os/dailyBrief'
import { composeNotificationFeed } from '@/lib/decision-os/notifications'
import { resolveDeliveryPlan } from '@/lib/decision-os/delivery/deliveryResolver'
import {
  DecisionOsBadge,
  DecisionOsEmptyState,
  decisionOsCardClassName,
} from './DecisionOsCardPrimitives'
import ManagerCommandCenterOverview from './ManagerCommandCenterOverview'
import CommissionerAttentionQueue from './CommissionerAttentionQueue'
import ManagerPriorityModule from './ManagerPriorityModule'
import ManagerLeagueSwitcher from './ManagerLeagueSwitcher'
import TodaysBriefCard from './TodaysBriefCard'
import NotificationCenter from './NotificationCenter'

type ManagerCommandCenterResponse = ManagerCommandCenterSnapshot & { draftsApproachingCount: number }

type ManagerCommandCenterSectionProps = {
  leagues: { id: string; name: string }[]
}

export default function ManagerCommandCenterSection({ leagues }: ManagerCommandCenterSectionProps) {
  const [snapshot, setSnapshot] = useState<ManagerCommandCenterResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasLeagues = leagues.length > 0

  useEffect(() => {
    if (!hasLeagues) {
      setSnapshot(null)
      return
    }
    let cancelled = false
    setError(null)
    void fetch('/api/decision-os/manager-command-center', {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<ManagerCommandCenterResponse>
      })
      .then((data) => {
        if (!cancelled) setSnapshot(data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your multi-league overview right now.')
      })
    return () => {
      cancelled = true
    }
  }, [hasLeagues])

  const leagueNameById = useMemo(() => new Map(leagues.map((league) => [league.id, league.name])), [leagues])

  // Composed directly from data this section already fetched — same zero-extra-fetch discipline
  // `CommissionerCommandCenterSection.tsx` established (see `docs/os/DAILY_BRIEF.md` §4).
  const brief = useMemo(
    () =>
      composeDailyBrief({
        leaguesMonitored: leagues.length,
        healthyLeagueCount: snapshot?.healthyLeagueCount ?? 0,
        draftsApproachingCount: snapshot?.draftsApproachingCount ?? 0,
        signals: snapshot?.attentionQueue ?? [],
        leagueTrends: snapshot?.leagueTrends ?? [],
      }),
    [snapshot, leagues.length],
  )

  const notifications = useMemo(
    () => composeNotificationFeed({ signals: snapshot?.attentionQueue ?? [], brief }),
    [snapshot, brief],
  )

  const deliveryPlan = useMemo(() => resolveDeliveryPlan(notifications), [notifications])

  // Phase OS-C3: found during live validation — 3 separate empty Priority Module boxes stacked
  // together (the common case: not every manager has an active recommendation in every category every
  // week) read as clutter, the same "near-permanently-empty standalone card" anti-pattern OS-B6 already
  // removed for Commissioner OS's Recent Changes card. Collapses to ONE honest combined empty state
  // only when ALL THREE categories are empty; any real content still renders each module individually.
  const priorityCategories = new Set(['lineup_discipline', 'trade_coaching', 'waiver_opportunity'])
  const hasAnyPriorities = (snapshot?.recommendations ?? []).some((entry) =>
    priorityCategories.has(entry.recommendation.category),
  )

  if (!hasLeagues) {
    return (
      <section data-testid="manager-command-center-section" className={decisionOsCardClassName}>
        <div className="p-5">
          <DecisionOsEmptyState
            icon={Compass}
            title="Your multi-league overview will appear here"
            description="Import or create a league to begin receiving Decision OS insights — once you belong to at least one league, this becomes your default view of what needs attention across every team you play in."
          />
        </div>
      </section>
    )
  }

  return (
    <section
      data-testid="manager-command-center-section"
      className={decisionOsCardClassName}
      aria-label="Manager multi-league overview"
    >
      <div className="border-b border-subtle bg-surface-muted/60 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <DecisionOsBadge icon={Compass}>Multi-League Overview</DecisionOsBadge>
        </div>
        <h2 className="mt-3 text-xl font-black tracking-tight text-primary">What needs your attention today?</h2>
        <p className="mt-1 text-xs leading-5 text-secondary">
          Across every team you play — select a league below to open its own dashboard.
        </p>
      </div>

      <div className="space-y-5 p-5">
        {error ? (
          <div
            data-testid="manager-command-center-error"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          >
            {error}
          </div>
        ) : null}

        <ManagerCommandCenterOverview
          totalLeagues={leagues.length}
          trackedLeagueCount={snapshot ? snapshot.totalLeagues - snapshot.unavailableLeagueCount : 0}
          leaguesNeedingAttentionCount={snapshot?.atRiskLeagueCount ?? 0}
          draftsApproachingCount={snapshot?.draftsApproachingCount ?? 0}
        />

        <TodaysBriefCard brief={brief} leagueNameById={leagueNameById} />

        <CommissionerAttentionQueue entries={snapshot?.attentionQueue ?? []} leagueNameById={leagueNameById} />

        {/* Phase OS-C2: Priority Modules — real Phase 6.4 manager-tier recommendations, grouped by
            their own real category. Same source data as the Attention Queue above (see
            docs/os/OS_C2_PRIORITIES_ARCHITECTURE_AUDIT.md for why this is intentional, not
            duplication). Phase OS-C3: collapsed to one combined empty state when all 3 are empty —
            see the `hasAnyPriorities` comment above. */}
        {hasAnyPriorities ? (
          <>
            <ManagerPriorityModule
              title="Lineup Priorities"
              icon={ListChecks}
              category="lineup_discipline"
              entries={snapshot?.recommendations ?? []}
              leagueNameById={leagueNameById}
              emptyMessage="No lineup priorities right now."
            />
            <ManagerPriorityModule
              title="Trade Priorities"
              icon={Repeat}
              category="trade_coaching"
              entries={snapshot?.recommendations ?? []}
              leagueNameById={leagueNameById}
              emptyMessage="No trade priorities right now."
            />
            <ManagerPriorityModule
              title="Waiver Priorities"
              icon={ShoppingCart}
              category="waiver_opportunity"
              entries={snapshot?.recommendations ?? []}
              leagueNameById={leagueNameById}
              emptyMessage="No waiver priorities right now."
            />
          </>
        ) : (
          <div
            className="flex items-center gap-2 rounded-xl border border-subtle bg-surface-muted px-4 py-3 text-sm text-muted"
            data-testid="manager-priorities-empty"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success" aria-hidden />
            No lineup, trade, or waiver priorities right now.
          </div>
        )}

        <NotificationCenter notifications={deliveryPlan.inApp} leagueNameById={leagueNameById} />

        <ManagerLeagueSwitcher leagues={leagues} />
      </div>
    </section>
  )
}

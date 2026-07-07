'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AiTimeContextPayload } from '@/lib/time-engine/types'
import type { TradesDashboardResponse, WaiverDashboardResponse } from '@/app/dashboard/dashboardStripApiTypes'
import type { TodayActionsEngineResponse } from '@/lib/today-actions-engine'
import { useEntitlements } from '@/hooks/useEntitlements'
import type { ChecklistStep, UserLeague } from '../types'
import type { LineupCheckPayload } from './LineupIssuesModal'
import { LineupIssuesModal } from './LineupIssuesModal'
import { PendingTradesModal } from './PendingTradesModal'
import { RankingsCard } from './RankingsCard'
import { WaiverRecommendationsModal } from './WaiverRecommendationsModal'
import { FavoriteSportsOnboardingModal } from './FavoriteSportsOnboardingModal'
import { QuickCreateModal } from '@/components/league-creation/QuickCreateModal'
import { ConnectPlatformsModal } from './ConnectPlatformsModal'
import type { FavoriteSportsSelection } from '@/lib/dashboard/favorite-sports-storage'
import {
  hasAnyFavoriteSport,
  readFavoriteSportsSelection,
  writeFavoriteSportsSelection,
} from '@/lib/dashboard/favorite-sports-storage'
import { buildLandingInviteUrl } from '@/lib/dashboard/invite-link-storage'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { emptyLineupActionSummary } from '@/lib/lineup-actions/emptySummary'
import { useFantasyContext, type PrimaryContext } from '@/hooks/useFantasyContext'
import { consumeDashboardRankRefreshPending } from '@/lib/import/dashboardRankRefresh'
import { LegacySnapshotCard } from './LegacySnapshotCard'
import { Crown } from 'lucide-react'
import { ActionCenter, countActionItems } from './warroom/ActionCenter'
import { TodayTimeline } from './warroom/TodayTimeline'
import { MyLeagueCard, rawStage } from './warroom/MyLeagueCard'
import { LeagueActivityFeed } from './warroom/LeagueActivityFeed'
import { CommissionerHub } from './warroom/CommissionerHub'
import { CoachNotes } from './warroom/CoachNotes'
import { DashboardHero } from './warroom/DashboardHero'

const ONBOARDING_KEY = 'af-onboarding-v1'
const STRIP_FETCH_STALE_MS = 5 * 60_000

type OnboardingState = {
  step1: boolean
  step2: boolean
  step3: boolean
  step4: boolean
  step5: boolean
}

type DashboardOverviewProps = {
  userId: string
  userName: string
  leagues: UserLeague[]
  /** True until the first `/api/league/list` response (SSR or client) resolves — lets My Leagues
   *  show a loading skeleton instead of looking indistinguishable from "zero leagues." */
  leaguesLoading?: boolean
  onTriggerImport: () => void
  onOpenChimmy: () => void
  /** SSR snapshot of `/api/user/rank` — rankings card renders without a client fetch round-trip. */
  initialUserRankPayload?: Record<string, unknown> | null
}

function getDefaultOnboardingState(): OnboardingState {
  return {
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
  }
}

function readOnboardingState() {
  if (typeof window === 'undefined') return getDefaultOnboardingState()

  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY)
    if (!raw) return getDefaultOnboardingState()

    const parsed = JSON.parse(raw) as Partial<OnboardingState>
    return {
      step1: parsed.step1 === true,
      step2: parsed.step2 === true,
      step3: parsed.step3 === true,
      step4: parsed.step4 === true,
      step5: parsed.step5 === true,
    }
  } catch {
    return getDefaultOnboardingState()
  }
}

function writeOnboardingState(value: OnboardingState) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(value))
  } catch {}
}

export function DashboardOverview({
  userId,
  userName,
  leagues,
  leaguesLoading = false,
  onTriggerImport,
  onOpenChimmy: _onOpenChimmy,
  initialUserRankPayload = null,
}: DashboardOverviewProps) {
  const router = useRouter()
  const { t, tInterpolate } = useLanguage()
  const { hasPro } = useEntitlements()
  const { context, selectedLeagueId, selectedLeague, setSelectedLeagueId } = useFantasyContext(leagues)
  const [onboarding, setOnboarding] = useState<OnboardingState>(getDefaultOnboardingState())
  /** UI-only per session — not persisted */
  const [checklistExpanded, setChecklistExpanded] = useState(false)
  const [sportsModalOpen, setSportsModalOpen] = useState(false)
  const [platformModalOpen, setPlatformModalOpen] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [lineupModalOpen, setLineupModalOpen] = useState(false)
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const [lineupData, setLineupData] = useState<LineupCheckPayload | null>(null)
  /** First `/api/lineup-check` bootstrap finished (avoids misleading preview counts). */
  const [lineupReady, setLineupReady] = useState(false)
  const [lineupLoading, setLineupLoading] = useState(false)

  const [waiverModalOpen, setWaiverModalOpen] = useState(false)
  const [waiverData, setWaiverData] = useState<WaiverDashboardResponse | null>(null)
  const [waiverLoading, setWaiverLoading] = useState(false)

  const [tradeModalOpen, setTradeModalOpen] = useState(false)
  const [tradeData, setTradeData] = useState<TradesDashboardResponse | null>(null)
  const [tradeLoading, setTradeLoading] = useState(false)

  /** Aggregated counts for Today strip (matchup DB rows, injury splits, war room). */
  const [todayCounts, setTodayCounts] = useState<TodayActionsEngineResponse['counts'] | null>(null)
  /** Primary league id from `/api/dashboard/today-actions` (War Room snapshot + waiver timing). */
  const [todayPrimaryLeagueId, setTodayPrimaryLeagueId] = useState<string | null>(null)
  /** Waiver process timing from DB league fields when resolved. */
  const [todayWaiverTiming, setTodayWaiverTiming] = useState<TodayActionsEngineResponse['waiverTiming'] | null>(null)
  /** Native (non-Sleeper) trades expiring within 48h, from `/api/dashboard/today-actions`. */
  const [expiringNativeTrades, setExpiringNativeTrades] = useState<TodayActionsEngineResponse['expiringNativeTrades']>(
    [],
  )
  /** AI Auto Start/Sit Protection snapshot (swap counts + global toggle). */
  const [todayAutoProtection, setTodayAutoProtection] = useState<
    TodayActionsEngineResponse['autoStartSitProtection'] | null
  >(null)
  /** Time engine envelope from `/api/dashboard/today-actions` (server UTC + account TZ). */
  const [stripTimeContext, setStripTimeContext] = useState<AiTimeContextPayload | null>(null)
  const deepLinkLeagueApplied = useRef(false)

  /** Increment after legacy rankings import so rank widgets refetch `/api/user/rank`. */
  const [rankRefreshKey, setRankRefreshKey] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const u = new URL(window.location.href)
      if (u.searchParams.get('rankSync') === '1') {
        setRankRefreshKey((k) => k + 1)
        u.searchParams.delete('rankSync')
        window.history.replaceState({}, '', `${u.pathname}${u.search}${u.hash}`)
        router.refresh()
      }
    } catch {
      /* ignore */
    }
  }, [router])

  useEffect(() => {
    if (consumeDashboardRankRefreshPending()) {
      setRankRefreshKey((k) => k + 1)
      router.refresh()
    }
  }, [router])

  /** Last successful `/api/dashboard/today-actions` refresh (lineup + waivers + trades + counts). */
  const stripFetchedAt = useRef<number | null>(null)

  useEffect(() => {
    if (leagues.length === 0) return
    let cancelled = false
    void fetch('/api/dashboard/today-actions', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TodayActionsEngineResponse | null) => {
        if (cancelled) return
        if (data) {
          setLineupData(data.lineup)
          setWaiverData(data.waivers)
          setTradeData(data.trades)
          setTodayCounts(data.counts)
          setTodayPrimaryLeagueId(data.primaryLeagueId ?? null)
          setTodayWaiverTiming(data.waiverTiming ?? null)
          setExpiringNativeTrades(data.expiringNativeTrades ?? [])
          setTodayAutoProtection(data.autoStartSitProtection ?? null)
          setStripTimeContext(data.aiTimeContext ?? null)
          stripFetchedAt.current = Date.now()
        } else {
          setLineupData(emptyLineupActionSummary())
          setWaiverData({ totalLeagues: 0, recommendations: [] })
          setTradeData({ totalPending: 0, trades: [] })
          setTodayCounts(null)
          setTodayPrimaryLeagueId(null)
          setTodayWaiverTiming(null)
          setExpiringNativeTrades([])
          setTodayAutoProtection(null)
          setStripTimeContext(null)
          stripFetchedAt.current = Date.now()
        }
        setLineupReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setLineupData(emptyLineupActionSummary())
        setWaiverData({ totalLeagues: 0, recommendations: [] })
        setTradeData({ totalPending: 0, trades: [] })
        setTodayCounts(null)
        setTodayPrimaryLeagueId(null)
        setTodayWaiverTiming(null)
        setExpiringNativeTrades([])
        setTodayAutoProtection(null)
        setStripTimeContext(null)
        stripFetchedAt.current = Date.now()
        setLineupReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [leagues.length])

  useEffect(() => {
    setOnboarding(readOnboardingState())
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetch('/api/user/dashboard-onboarding', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            checklist?: Partial<OnboardingState>
            favoriteSports?: FavoriteSportsSelection
          } | null
        ) => {
          if (!data || cancelled) return
          if (data.checklist) {
            const s = data.checklist
            setOnboarding((prev) => {
              const next: OnboardingState = {
                step1: prev.step1 || s.step1 === true,
                step2: prev.step2 || s.step2 === true,
                step3: prev.step3 || s.step3 === true,
                step4: prev.step4 || s.step4 === true,
                step5: prev.step5 || s.step5 === true,
              }
              writeOnboardingState(next)
              return next
            })
          }
          if (data.favoriteSports && (data.favoriteSports.supported?.length || data.favoriteSports.custom?.length)) {
            writeFavoriteSportsSelection(data.favoriteSports)
          }
        }
      )
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const fav = readFavoriteSportsSelection()
    if (!hasAnyFavoriteSport(fav)) return
    setOnboarding((prev) => {
      if (prev.step1) return prev
      const next = { ...prev, step1: true }
      writeOnboardingState(next)
      return next
    })
  }, [])

  const patchChecklistOnServer = useCallback(async (partial: Partial<OnboardingState>) => {
    try {
      await fetch('/api/user/dashboard-onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist: partial }),
      })
    } catch {}
  }, [])

  useEffect(() => {
    if (leagues.length === 0) return
    setOnboarding((prev) => {
      if (prev.step2 && prev.step3) return prev
      const next = {
        ...prev,
        step2: true,
        step3: true,
      }
      writeOnboardingState(next)
      void patchChecklistOnServer({ step2: true, step3: true })
      return next
    })
  }, [leagues.length, patchChecklistOnServer])

  const updateOnboardingStep = useCallback(
    (step: keyof OnboardingState, value = true) => {
      setOnboarding((current) => {
        const next = { ...current, [step]: value }
        writeOnboardingState(next)
        return next
      })
      void patchChecklistOnServer({ [step]: value })
    },
    [patchChecklistOnServer]
  )

  const checklistSteps = useMemo<ChecklistStep[]>(
    () => [
      {
        id: 'step1',
        label: t('dashboard.onboarding.step1.label'),
        description: t('dashboard.onboarding.step1.desc'),
        done: onboarding.step1,
        ctaLabel: t('dashboard.onboarding.step1.cta'),
      },
      {
        id: 'step2',
        label: t('dashboard.onboarding.step2.label'),
        description: t('dashboard.onboarding.step2.desc'),
        done: onboarding.step2,
        ctaLabel: t('dashboard.onboarding.step2.cta'),
      },
      {
        id: 'step3',
        label: t('dashboard.onboarding.step3.label'),
        description: t('dashboard.onboarding.step3.desc'),
        done: onboarding.step3,
        ctaHref: '/af-rankings',
        ctaLabel: t('dashboard.onboarding.step3.cta'),
      },
      {
        id: 'step4',
        label: t('dashboard.onboarding.step4.label'),
        description: t('dashboard.onboarding.step4.desc'),
        done: onboarding.step4,
        ctaHref: '/ai/tools',
        ctaLabel: t('dashboard.onboarding.step4.cta'),
      },
      {
        id: 'step5',
        label: t('dashboard.onboarding.step5.label'),
        description: t('dashboard.onboarding.step5.desc'),
        done: onboarding.step5,
        ctaLabel: inviteCopied ? t('dashboard.onboarding.step5.ctaCopied') : t('dashboard.onboarding.step5.ctaCopy'),
      },
    ],
    [onboarding, inviteCopied, t]
  )

  const completedCount = checklistSteps.filter((step) => step.done).length
  const allDone = completedCount === checklistSteps.length

  const handleImport = () => {
    updateOnboardingStep('step2')
    onTriggerImport()
  }

  const handleCopyReferral = async () => {
    let inviteUrl = ''
    try {
      const res = await fetch('/api/user/landing-invite', { cache: 'no-store' })
      if (res.ok) {
        const data = (await res.json()) as { landingUrl?: string }
        if (typeof data.landingUrl === 'string' && data.landingUrl.startsWith('http')) {
          inviteUrl = data.landingUrl
        }
      }
    } catch {}
    if (!inviteUrl) inviteUrl = buildLandingInviteUrl()
    if (!inviteUrl) return

    try {
      await navigator.clipboard.writeText(inviteUrl)
      updateOnboardingStep('step5')
      setInviteCopied(true)
      window.setTimeout(() => setInviteCopied(false), 2500)
    } catch {}
  }

  const refreshTodayActionsBundle = useCallback(() => {
    return fetch('/api/dashboard/today-actions', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('today-actions'))))
      .then((data: TodayActionsEngineResponse) => {
        setLineupData(data.lineup)
        setWaiverData(data.waivers)
        setTradeData(data.trades)
        setTodayCounts(data.counts)
        setTodayPrimaryLeagueId(data.primaryLeagueId ?? null)
        setTodayWaiverTiming(data.waiverTiming ?? null)
        setExpiringNativeTrades(data.expiringNativeTrades ?? [])
        setTodayAutoProtection(data.autoStartSitProtection ?? null)
        setStripTimeContext(data.aiTimeContext ?? null)
        stripFetchedAt.current = Date.now()
      })
  }, [])

  /** Prefer dashboard league selector; fall back to primary league from today-actions for tool context. */
  const aiToolFocusLeagueId = useMemo(
    () => selectedLeagueId ?? todayPrimaryLeagueId ?? undefined,
    [selectedLeagueId, todayPrimaryLeagueId],
  )

  const handleLineupIssuesClick = useCallback(() => {
    setLineupModalOpen(true)
    const now = Date.now()
    const fresh =
      lineupData !== null &&
      stripFetchedAt.current !== null &&
      now - stripFetchedAt.current < STRIP_FETCH_STALE_MS
    if (fresh) return
    setLineupLoading(true)
    void refreshTodayActionsBundle()
      .catch(() => {
        setLineupData(emptyLineupActionSummary())
        stripFetchedAt.current = Date.now()
      })
      .finally(() => setLineupLoading(false))
  }, [lineupData, refreshTodayActionsBundle])

  const handleWaiverClick = useCallback(() => {
    setWaiverModalOpen(true)
    const now = Date.now()
    const fresh =
      waiverData !== null &&
      stripFetchedAt.current !== null &&
      now - stripFetchedAt.current < STRIP_FETCH_STALE_MS
    if (fresh) return
    setWaiverLoading(true)
    void refreshTodayActionsBundle()
      .catch(() => {
        setWaiverData({ totalLeagues: 0, recommendations: [] })
        stripFetchedAt.current = Date.now()
      })
      .finally(() => setWaiverLoading(false))
  }, [waiverData, refreshTodayActionsBundle])

  const handleTradeClick = useCallback(() => {
    setTradeModalOpen(true)
    const now = Date.now()
    const fresh =
      tradeData !== null &&
      stripFetchedAt.current !== null &&
      now - stripFetchedAt.current < STRIP_FETCH_STALE_MS
    if (fresh) return
    setTradeLoading(true)
    void refreshTodayActionsBundle()
      .catch(() => {
        setTradeData({ totalPending: 0, trades: [] })
        stripFetchedAt.current = Date.now()
      })
      .finally(() => setTradeLoading(false))
  }, [tradeData, refreshTodayActionsBundle])

  const handleWarRoomToolClick = useCallback(() => {
    if (typeof window === 'undefined') return
    document.querySelector('[data-testid="ai-tools-grid"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.dispatchEvent(
      new CustomEvent('af-open-ai-tool', {
        detail: { tool: 'warRoom', ...(aiToolFocusLeagueId ? { focusLeagueId: aiToolFocusLeagueId } : {}) },
      }),
    )
  }, [aiToolFocusLeagueId])

  useEffect(() => {
    if (!lineupModalOpen && !waiverModalOpen && !tradeModalOpen) return
    const interval = window.setInterval(() => {
      void fetch('/api/dashboard/today-actions', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: TodayActionsEngineResponse | null) => {
          if (!d) return
          setLineupData(d.lineup)
          setWaiverData(d.waivers)
          setTradeData(d.trades)
          setTodayCounts(d.counts)
          setTodayPrimaryLeagueId(d.primaryLeagueId ?? null)
          setTodayWaiverTiming(d.waiverTiming ?? null)
          setExpiringNativeTrades(d.expiringNativeTrades ?? [])
          setTodayAutoProtection(d.autoStartSitProtection ?? null)
          setStripTimeContext(d.aiTimeContext ?? null)
          stripFetchedAt.current = Date.now()
        })
        .catch(() => {})
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [lineupModalOpen, waiverModalOpen, tradeModalOpen])

  useEffect(() => {
    if (deepLinkLeagueApplied.current || leagues.length === 0) return
    const q = new URLSearchParams(window.location.search).get('league')?.trim()
    if (q && leagues.some((l) => l.id === q)) {
      setSelectedLeagueId(q)
      deepLinkLeagueApplied.current = true
    }
  }, [leagues, setSelectedLeagueId])

  const waiverChipCount = useMemo(() => {
    if (todayCounts) return todayCounts.waiverPickupSuggestions
    if (!waiverData?.recommendations?.length) return 0
    return waiverData.recommendations.reduce((n, r) => n + (r.pickups?.length ?? 0), 0)
  }, [todayCounts, waiverData])

  const warRoomDecisionsToReview = useMemo(() => {
    if (todayCounts) return todayCounts.warRoomDecisionsToReview
    const actions = lineupData?.actions ?? []
    return actions.filter((a) => a.reasonType === 'war_room' || a.sourceModule === 'AFWarRoom').length
  }, [todayCounts, lineupData])

  const pendingTradeChipCount = tradeData?.totalPending ?? 0

  /** Leagues in pre_draft with a real, future draftDate — purely client-side, no new fetch. */
  const upcomingDrafts = useMemo(() => {
    const now = Date.now()
    return leagues
      .filter((l) => rawStage(l) === 'pre_draft' && l.draftDate && new Date(l.draftDate).getTime() > now)
      .map((l) => ({ leagueId: l.id, leagueName: l.name, draftDate: l.draftDate as string }))
  }, [leagues])

  const urgentTodayCount = useMemo(
    () => countActionItems(lineupData?.actions ?? [], waiverChipCount, pendingTradeChipCount, warRoomDecisionsToReview),
    [lineupData, waiverChipCount, pendingTradeChipCount, warRoomDecisionsToReview],
  )

  const handleAiShortcut = useCallback((_prompt: string) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('af-dashboard-focus-left-chimmy'))
    window.dispatchEvent(new CustomEvent('af-dashboard-open-mobile-left'))
  }, [])

  /** My Leagues narrows to commissioned-only in Commissioner Focus (secondary billing per the
   *  locked Dashboard V2 architecture, Section 1); Global and Team Focus show every league. */
  const myLeaguesList = context === 'commissioner' ? leagues.filter((l) => l.isCommissioner) : leagues

  const todaysAgendaSection = (
    <section key="agenda" className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/30">
        {t('dashboard.warroom.today.title')}
      </p>
      <ActionCenter
        lineupActions={lineupData?.actions ?? []}
        waiverPickupSuggestions={waiverChipCount}
        pendingTradeCount={pendingTradeChipCount}
        warRoomDecisionsToReview={warRoomDecisionsToReview}
        onLineupIssuesClick={handleLineupIssuesClick}
        onWaiverClick={handleWaiverClick}
        onTradesClick={handleTradeClick}
        onWarRoomClick={handleWarRoomToolClick}
      />
      <TodayTimeline
        lineupActions={lineupData?.actions ?? []}
        waiverTiming={todayWaiverTiming}
        autoSwapsLast24h={todayAutoProtection?.autoSwapsLast24h ?? 0}
        pendingTradeCount={pendingTradeChipCount}
        upcomingDrafts={upcomingDrafts}
        expiringNativeTrades={expiringNativeTrades}
      />
    </section>
  )

  const myLeaguesSection = leaguesLoading ? (
    <section key="myLeagues" className="space-y-2.5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/30">
        {t('dashboard.warroom.myLeagues.title')}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="warroom-card h-[168px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]" />
        ))}
      </div>
    </section>
  ) : myLeaguesList.length > 0 ? (
    <section key="myLeagues" className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Crown className="h-3.5 w-3.5 text-amber-400/80" aria-hidden />
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/30">
          {t('dashboard.warroom.myLeagues.title')}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {myLeaguesList.map((l) => (
          <MyLeagueCard
            key={l.id}
            league={l}
            userId={userId}
            waiverTiming={l.id === todayPrimaryLeagueId ? todayWaiverTiming : null}
          />
        ))}
      </div>
    </section>
  ) : null

  const commissionerHubSection = (
    // Self-gates to nothing when the viewer commissions no league. The fuller Command Center
    // (alerts, pending approvals, playoff setup, etc.) is Phase 2.3 scope per the architecture doc.
    <CommissionerHub key="commissionerHub" leagues={leagues} />
  )

  const weeklyGamePlanSection = (
    <CoachNotes key="weeklyGamePlan" lineupActions={lineupData?.actions ?? []} pendingTrades={tradeData?.trades ?? []} />
  )

  const rankingsLegacySection = (
    <section key="rankingsLegacy" className="space-y-2.5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/30">
        {t('dashboard.warroom.rankingsLegacy.title')}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <RankingsCard
          initialRankPayload={initialUserRankPayload}
          onImportNow={handleImport}
          rankRefreshKey={rankRefreshKey}
          onAskChimmy={() => {
            const prompt =
              'Explain my AllFantasy AF rank, tier, and XP — what should I focus on to climb the ladder?'
            handleAiShortcut(prompt)
            window.dispatchEvent(
              new CustomEvent('af-chimmy-shortcut', {
                detail: { prompt },
              })
            )
          }}
        />
        <LegacySnapshotCard rankPayload={initialUserRankPayload} />
      </div>
    </section>
  )

  const leagueBuzzSection = <LeagueActivityFeed key="leagueBuzz" />

  /** Dashboard V2 Phase 2.2 — FantasyContextEngine section priority. Same components in every
   *  context (per the "reuse, don't duplicate" rule); only their order changes. Global matches
   *  the Phase 2.1 shell unchanged. Commissioner Focus promotes the Commissioner Hub to primary
   *  billing; Team Focus promotes Weekly Game Plan and Rankings & Legacy (the manager-facing
   *  sections) ahead of the Commissioner Hub, which stays reachable but demoted. */
  const sectionsByContext: Record<PrimaryContext, ReactNode[]> = {
    global: [
      todaysAgendaSection,
      myLeaguesSection,
      commissionerHubSection,
      weeklyGamePlanSection,
      rankingsLegacySection,
      leagueBuzzSection,
    ],
    commissioner: [
      commissionerHubSection,
      myLeaguesSection,
      todaysAgendaSection,
      weeklyGamePlanSection,
      rankingsLegacySection,
      leagueBuzzSection,
    ],
    team: [
      weeklyGamePlanSection,
      todaysAgendaSection,
      rankingsLegacySection,
      myLeaguesSection,
      commissionerHubSection,
      leagueBuzzSection,
    ],
  }

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto [scrollbar-gutter:stable]">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        {/* 1. DASHBOARD HERO — Dashboard V2 Phase 2.2, context-aware (Global / Commissioner / Team).
            World Cup promo moved out of the primary dashboard experience in Phase 2.1 (still
            reachable at /brackets/world-cup, not deleted). */}
        <DashboardHero
          context={context}
          userName={userName}
          leagues={leagues}
          selectedLeagueId={selectedLeagueId}
          selectedLeague={selectedLeague}
          onSelectLeagueId={setSelectedLeagueId}
          urgentTodayCount={urgentTodayCount}
        />

        {allDone ? (
          <p className="text-xs text-cyan-400/95">{t('dashboard.overview.allSet')}</p>
        ) : checklistExpanded ? (
          <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#0c0c1e]">
            <button
              type="button"
              onClick={() => setChecklistExpanded(false)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div>
                <p className="text-sm font-bold text-white">{t('dashboard.overview.getStarted')}</p>
                <p className="mt-1 text-xs text-white/40">
                  {tInterpolate('dashboard.overview.checklistProgress', { done: completedCount })}
                </p>
              </div>
              <span
                className="inline-block text-lg leading-none text-white/40 transition-transform duration-200"
                style={{ transform: 'rotate(90deg)' }}
                aria-hidden
              >
                ›
              </span>
            </button>

            <div className="border-t border-white/8">
                {checklistSteps.map((step) => (
                  <div key={step.id} className="flex items-center gap-3 border-b border-white/6 px-4 py-3 last:border-b-0">
                    <div
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                        step.done
                          ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                          : 'border-white/20 text-white/20'
                      }`}
                    >
                      {step.done ? '✓' : ''}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white/85">{step.label}</p>
                      <p className="mt-0.5 text-xs text-white/45">{step.description}</p>
                    </div>

                    {!step.done ? (
                      step.id === 'step1' ? (
                        <button
                          type="button"
                          data-testid="get-started-sports-cta"
                          onClick={() => setSportsModalOpen(true)}
                          className="text-xs font-semibold text-cyan-400 hover:underline"
                        >
                          {step.ctaLabel}
                        </button>
                      ) : step.id === 'step2' ? (
                        <button
                          type="button"
                          data-testid="get-started-connect-cta"
                          onClick={() => setPlatformModalOpen(true)}
                          className="text-xs font-semibold text-cyan-400 hover:underline"
                        >
                          {step.ctaLabel}
                        </button>
                      ) : step.id === 'step4' && step.ctaHref ? (
                        <Link
                          href={step.ctaHref}
                          data-testid="get-started-af-ai-tools-cta"
                          onClick={() => updateOnboardingStep('step4')}
                          className="text-xs font-semibold text-cyan-400 hover:underline"
                        >
                          {step.ctaLabel}
                        </Link>
                      ) : step.id === 'step5' ? (
                        <button
                          type="button"
                          data-testid="get-started-invite-copy"
                          onClick={() => void handleCopyReferral()}
                          className="text-xs font-semibold text-cyan-400 hover:underline"
                        >
                          {step.ctaLabel}
                        </button>
                      ) : step.ctaHref ? (
                        <Link
                          href={step.ctaHref}
                          onClick={() => {
                            if (step.id === 'step3') updateOnboardingStep('step3')
                          }}
                          className="text-xs font-semibold text-cyan-400 hover:underline"
                        >
                          {step.ctaLabel}
                        </Link>
                      ) : null
                    ) : step.id === 'step1' ? (
                      <button
                        type="button"
                        onClick={() => setSportsModalOpen(true)}
                        className="text-xs font-semibold text-white/40 hover:text-cyan-400 hover:underline"
                      >
                        {t('dashboard.onboarding.edit')}
                      </button>
                    ) : step.id === 'step2' ? (
                      <button
                        type="button"
                        onClick={() => setPlatformModalOpen(true)}
                        className="text-xs font-semibold text-white/40 hover:text-cyan-400 hover:underline"
                      >
                        {t('dashboard.onboarding.add')}
                      </button>
                    ) : null}
                  </div>
                ))}
            </div>
          </section>
        ) : (
          <button
            type="button"
            onClick={() => setChecklistExpanded(true)}
            className="group relative flex h-10 w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 text-[12px] text-white/60 transition hover:border-white/12 hover:bg-white/[0.06]"
            data-testid="dashboard-setup-collapsed"
          >
            <span className="z-10 whitespace-nowrap text-white/70">
              {tInterpolate('dashboard.overview.setupCollapsed', { done: completedCount })}
            </span>
            <span
              className="z-10 ml-auto inline-flex items-center gap-1.5 text-white/40 transition-transform group-hover:text-white/70"
              aria-hidden
            >
              <span className="text-[11px] font-medium tabular-nums">
                {completedCount}/{checklistSteps.length}
              </span>
              ›
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/[0.04]"
            />
            <span
              aria-hidden
              data-testid="dashboard-setup-progress-fill"
              style={{
                width: `${Math.round((completedCount / Math.max(1, checklistSteps.length)) * 100)}%`,
              }}
              className="pointer-events-none absolute bottom-0 left-0 h-1 bg-gradient-to-r from-cyan-400 via-cyan-300 to-violet-400 shadow-[0_0_8px_rgba(34,211,238,0.45)] transition-[width] duration-300"
            />
          </button>
        )}

        {/* 2-7. Context-ordered sections — Dashboard V2 Phase 2.2. Same components in every
            context; only their order (sectionsByContext, defined above) changes. */}
        {sectionsByContext[context]}

        {/* 8. FOOTER */}
        <footer className="border-t border-white/[0.06] pt-4 text-center text-[11px] text-white/25">
          {t('dashboard.warroom.footer.tagline')}
        </footer>
      </div>

      <LineupIssuesModal
        isOpen={lineupModalOpen}
        onClose={() => setLineupModalOpen(false)}
        data={lineupData}
        loading={lineupLoading}
        hasProAccess={hasPro}
      />

      <WaiverRecommendationsModal
        isOpen={waiverModalOpen}
        onClose={() => setWaiverModalOpen(false)}
        data={waiverData}
        loading={waiverLoading}
        hasProAccess={hasPro}
      />

      <PendingTradesModal
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        data={tradeData}
        loading={tradeLoading}
        hasProAccess={hasPro}
      />

      <QuickCreateModal open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} />

      <FavoriteSportsOnboardingModal
        open={sportsModalOpen}
        onClose={() => setSportsModalOpen(false)}
        onSaved={(selection) => {
          setOnboarding((c) => {
            const next = { ...c, step1: true }
            writeOnboardingState(next)
            return next
          })
          void fetch('/api/user/dashboard-onboarding', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              checklist: { step1: true },
              favoriteSports: selection,
            }),
          }).catch(() => {})
        }}
      />
      <ConnectPlatformsModal
        open={platformModalOpen}
        onClose={() => setPlatformModalOpen(false)}
        onMarkConnectIntent={() => updateOnboardingStep('step2')}
      />
    </div>
  )
}

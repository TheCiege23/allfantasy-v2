'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AiTimeContextPayload } from '@/lib/time-engine/types'
import type { TradesDashboardResponse, WaiverDashboardResponse } from '@/app/dashboard/dashboardStripApiTypes'
import type { TodayActionsEngineResponse } from '@/lib/today-actions-engine'
import { useEntitlements } from '@/hooks/useEntitlements'
import type { ChecklistStep, UserLeague } from '../types'
import { AIToolsGrid } from '@/components/ai-tools/AIToolsGrid'
import { PowerRankingsMiniCard } from '@/components/ai-tools/PowerRankingsMiniCard'
import { InjuryImpactMiniCard } from '@/components/ai-tools/InjuryImpactMiniCard'
import { WarRoomMiniCard } from '@/components/ai-tools/WarRoomMiniCard'
import { MatchupPrepMiniCard } from '@/components/ai-tools/MatchupPrepMiniCard'
import type { LineupCheckPayload } from './LineupIssuesModal'
import { LineupIssuesModal } from './LineupIssuesModal'
import { PendingTradesModal } from './PendingTradesModal'
import { RankingsCard } from './RankingsCard'
import { WaiverRecommendationsModal } from './WaiverRecommendationsModal'
import { FavoriteSportsOnboardingModal } from './FavoriteSportsOnboardingModal'
import { StandingsWidget } from '@/components/sports/StandingsWidget'
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
import { useDashboardToolLeague } from '@/hooks/useDashboardToolLeague'
import { consumeDashboardRankRefreshPending } from '@/lib/import/dashboardRankRefresh'
import { DashboardIntelligenceRail } from './DashboardIntelligenceRail'
import { WarRoomPreviewBlock } from './WarRoomPreviewBlock'
import { LegacySnapshotCard } from './LegacySnapshotCard'
import { WorldCupDashboardPromo } from './WorldCupDashboardPromo'
import { Swords, Sparkles, Crown } from 'lucide-react'
import { ActionCenter } from './warroom/ActionCenter'
import { TodayTimeline } from './warroom/TodayTimeline'
import { MyLeagueCard } from './warroom/MyLeagueCard'
import { MatchupPreviewCard } from './warroom/MatchupPreviewCard'
import { WaiverWirePreview } from './warroom/WaiverWirePreview'
import { LeagueActivityFeed } from './warroom/LeagueActivityFeed'

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
  onTriggerImport,
  onOpenChimmy: _onOpenChimmy,
  initialUserRankPayload = null,
}: DashboardOverviewProps) {
  const router = useRouter()
  const { t, tInterpolate } = useLanguage()
  const { hasPro } = useEntitlements()
  const { selectedLeagueId, selectedLeague, setSelectedLeagueId } = useDashboardToolLeague(leagues)
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

  const handleAiShortcut = useCallback((_prompt: string) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('af-dashboard-focus-left-chimmy'))
    window.dispatchEvent(new CustomEvent('af-dashboard-open-mobile-left'))
  }, [])

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto [scrollbar-gutter:stable]">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <WorldCupDashboardPromo />
        {(() => {
          const inSeasonNflLeagues = leagues.filter(
            (l) => l.sport === 'NFL' && l.status === 'in_season'
          )
          if (inSeasonNflLeagues.length === 0) return null
          const weekNum = inSeasonNflLeagues[0]?.currentWeek
          return (
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] px-3 py-2 text-[12px]">
              <span className="font-semibold text-cyan-200">
                🏈{weekNum != null ? ` NFL Week ${weekNum}` : ' NFL Season'}
              </span>
              <span className="ml-2 text-white/45">
                {inSeasonNflLeagues.length === 1
                  ? '1 league active this week'
                  : `${inSeasonNflLeagues.length} leagues active this week`}
              </span>
            </div>
          )
        })()}
        <DashboardIntelligenceRail
          leagueId={selectedLeagueId ?? null}
          leagueName={selectedLeague?.name ?? null}
          leagueSport={selectedLeague?.sport ?? null}
          leagueType={selectedLeague?.leagueType ?? null}
        />
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

        <section className="relative overflow-hidden rounded-2xl border border-cyan-500/[0.15] bg-gradient-to-br from-cyan-500/[0.07] via-[#050814] to-violet-500/[0.04] p-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-70"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(34,211,238,0.16) 0%, transparent 70%)',
            }}
          />
          <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-400/60">
            AllFantasy Command Center
          </p>
          <h1 className="mt-1.5 text-[26px] font-black leading-tight tracking-tight text-white sm:text-[30px]">
            Your fantasy command center is live.
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/55">
            Chimmy is watching your drafts, matchups, waivers, and league activity so you know what to do next.
          </p>
          <p className="mt-1.5 text-[12px] font-semibold text-amber-400/70">
            Built for commissioners. Loved by managers.
          </p>

          {/* Primary command cards */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Link
              href="/war-room"
              className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/[0.12] via-cyan-500/[0.06] to-transparent p-4 transition hover:border-cyan-400/50 hover:from-cyan-500/[0.18] active:opacity-90"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                <Swords className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-[15px] font-bold text-white">Open War Room</p>
              <p className="text-[12px] leading-snug text-white/55">Draft smarter with AI pick strategy.</p>
              <span className="mt-auto pt-1 text-[12px] font-semibold text-cyan-400 transition group-hover:text-cyan-300">
                Enter →
              </span>
            </Link>

            <Link
              href="/commissioner-hub"
              className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.10] via-amber-500/[0.05] to-transparent p-4 shadow-[0_0_20px_rgba(245,158,11,0.06)] transition hover:border-amber-400/50 hover:from-amber-500/[0.16] active:opacity-90"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                <Crown className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-[15px] font-bold text-white">
                {leagues.some((l) => l.isCommissioner) ? 'Commissioner Hub' : 'Run a League'}
              </p>
              <p className="text-[12px] leading-snug text-white/55">Create, import, invite, and manage your league.</p>
              <span className="mt-auto pt-1 text-[12px] font-semibold text-amber-400 transition group-hover:text-amber-300">
                Enter →
              </span>
            </Link>

            <button
              type="button"
              onClick={() => handleAiShortcut('')}
              className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/[0.10] via-violet-500/[0.05] to-transparent p-4 text-left transition hover:border-violet-400/50 hover:from-violet-500/[0.16] active:opacity-90"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-[15px] font-bold text-white">Ask Chimmy</p>
              <p className="text-[12px] leading-snug text-white/55">Get calm, evidence-based fantasy help.</p>
              <span className="mt-auto pt-1 text-[12px] font-semibold text-violet-400 transition group-hover:text-violet-300">
                Ask →
              </span>
            </button>
          </div>

          {/* Secondary action row */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
            <Link
              href="/create-league"
              className="touch-manipulation inline-flex min-h-[40px] w-full items-center justify-center rounded-xl border border-white/15 px-3 py-2 text-[12px] font-semibold text-white/70 transition hover:border-white/30 hover:bg-white/[0.04] active:bg-white/10 sm:w-auto"
            >
              {t('dashboard.overview.createLeague')}
            </Link>
            <button
              type="button"
              onClick={() => setQuickCreateOpen(true)}
              className="touch-manipulation inline-flex min-h-[40px] w-full items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-[12px] font-semibold text-purple-300 transition hover:bg-purple-500/20 active:bg-purple-500/25 sm:w-auto"
            >
              ✨ Quick Create
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="touch-manipulation inline-flex min-h-[40px] w-full items-center justify-center rounded-xl border border-white/20 px-3 py-2 text-[12px] font-semibold text-white active:bg-white/10 sm:w-auto"
            >
              {t('dashboard.overview.import')}
            </button>
            <Link
              href="/find-league"
              className="touch-manipulation inline-flex min-h-[40px] w-full items-center justify-center rounded-xl border border-white/15 px-3 py-2 text-[12px] font-semibold text-white/70 transition hover:border-white/30 hover:bg-white/[0.04] active:bg-white/10 sm:w-auto"
            >
              {t('dashboard.overview.findLeague')}
            </Link>
            <Link
              href="/brackets"
              className="touch-manipulation inline-flex min-h-[40px] w-full items-center justify-center rounded-xl border border-white/15 px-3 py-2 text-[12px] font-semibold text-white/70 transition hover:border-white/30 hover:bg-white/[0.04] active:bg-white/10 sm:w-auto"
              data-testid="dashboard-brackets-link"
            >
              {t('dashboard.overview.brackets')}
            </Link>
            <Link
              href="/af-rankings"
              className="touch-manipulation inline-flex min-h-[40px] w-full items-center justify-center rounded-xl border border-white/15 px-3 py-2 text-[12px] font-semibold text-white/70 transition hover:border-white/30 hover:bg-white/[0.04] active:bg-white/10 sm:w-auto"
              data-testid="dashboard-rankings-link"
            >
              Rankings
            </Link>
            <Link
              href="/ai/tools"
              className="touch-manipulation inline-flex min-h-[40px] w-full items-center justify-center rounded-xl border border-white/15 px-3 py-2 text-[12px] font-semibold text-white/70 transition hover:border-white/30 hover:bg-white/[0.04] active:bg-white/10 sm:w-auto"
              data-testid="dashboard-ai-tools-link"
            >
              Intelligence Hub
            </Link>
          </div>
        </section>

        <WarRoomPreviewBlock />

        <WaiverWirePreview data={waiverData} onOpenAll={handleWaiverClick} />

        {leagues.length > 0 ? (
          <section className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-amber-400/80" aria-hidden />
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/30">My Leagues</p>
              <Link
                href="/commissioner-hub"
                className="ml-auto text-[11px] font-semibold text-white/30 transition hover:text-white/60"
              >
                View all →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {leagues.slice(0, 6).map((l) => (
                <MyLeagueCard key={l.id} league={l} userId={userId} />
              ))}
            </div>
          </section>
        ) : null}

        {leagues.some((l) => l.status === 'in_season') ? (
          <section className="space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/30">Today&apos;s Matchups</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {leagues
                .filter((l) => l.status === 'in_season')
                .slice(0, 4)
                .map((l) => (
                  <MatchupPreviewCard key={l.id} league={l} userId={userId} />
                ))}
            </div>
          </section>
        ) : null}

        <LeagueActivityFeed />

        <section className="space-y-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-white/30">
              {t('dashboard.overview.leagueIntelligenceTitle')}
            </p>
            <p className="mt-1 max-w-xl text-[11px] leading-snug text-white/45">
              {t('dashboard.overview.leagueIntelligenceSubtitle')}
            </p>
          </div>

          {leagues.length > 1 ? (
            <label className="block max-w-md text-[10px] font-bold uppercase tracking-wide text-white/40">
              {t('dashboard.overview.leagueSelectorLabel')}
              <select
                value={selectedLeagueId ?? ''}
                onChange={(e) => {
                  const id = e.target.value
                  setSelectedLeagueId(id)
                  try {
                    const url = new URL(window.location.href)
                    url.searchParams.set('league', id)
                    window.history.replaceState({}, '', url.toString())
                  } catch {
                    /* ignore */
                  }
                }}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0a1220] px-3 py-2 text-[13px] text-white/90"
              >
                {leagues.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.sport})
                  </option>
                ))}
              </select>
            </label>
          ) : leagues.length === 1 && selectedLeague ? (
            <p className="text-[11px] text-cyan-200/85">
              <span className="inline-flex max-w-full items-center truncate rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-semibold text-white/90">
                {selectedLeague.name}
              </span>{' '}
              <span className="text-white/45">{String(selectedLeague.sport)}</span>
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PowerRankingsMiniCard leagues={leagues} selectedLeagueId={selectedLeagueId} />
            <InjuryImpactMiniCard leagues={leagues} selectedLeagueId={selectedLeagueId} />
            <WarRoomMiniCard leagues={leagues} selectedLeagueId={selectedLeagueId} />
            <MatchupPrepMiniCard leagues={leagues} selectedLeagueId={selectedLeagueId} />
          </div>
        </section>

        <AIToolsGrid leagues={leagues} selectedLeagueId={selectedLeagueId} />

        {selectedLeague ? (
          <StandingsWidget leagueId={selectedLeague.id} sport={String(selectedLeague.sport)} />
        ) : null}

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

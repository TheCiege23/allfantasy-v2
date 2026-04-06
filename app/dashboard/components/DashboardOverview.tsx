'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TradesDashboardResponse, WaiverDashboardResponse } from '@/app/dashboard/dashboardStripApiTypes'
import { useEntitlements } from '@/hooks/useEntitlements'
import type { ChecklistStep, UserLeague } from '../types'
import { AIShortcutsGrid } from './AIShortcutsGrid'
import type { LineupCheckPayload } from './LineupIssuesModal'
import { LineupIssuesModal } from './LineupIssuesModal'
import { PendingTradesModal } from './PendingTradesModal'
import { RankingsCard } from './RankingsCard'
import { TodayStrip } from './TodayStrip'
import { LegacyImportProgressWidget } from './LegacyImportProgressWidget'
import { WaiverRecommendationsModal } from './WaiverRecommendationsModal'

const ONBOARDING_KEY = 'af-onboarding-v1'
const STRIP_FETCH_STALE_MS = 5 * 60_000

type OnboardingState = {
  step1: boolean
  step2: boolean
  step3: boolean
  step4: boolean
  step5: boolean
}

type RankPayload = {
  imported: boolean
  rank: {
    careerTier: number
    careerTierName: string
    careerLevel: number
    careerXp: string
    aiReportGrade: string
    aiScore: number
    aiInsight: string
    winRate: number
    playoffRate: number
    championshipCount: number
    seasonsPlayed: number
    totalWins?: number
    totalLosses?: number
    totalTies?: number
    playoffAppearances?: number
    importedAt: string | null
  } | null
  overviewProfile?: {
    lanes?: Array<{
      wins: number
      losses: number
      ties: number
    }>
  } | null
}

type DashboardOverviewProps = {
  userName: string
  leagues: UserLeague[]
  onTriggerImport: () => void
  onOpenChimmy: () => void
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

function getPlatformBadge(platform: string) {
  switch (platform.toLowerCase()) {
    case 'sleeper':
      return '🌙'
    case 'yahoo':
      return '🏈'
    case 'mfl':
      return '🏆'
    case 'fantrax':
      return '📊'
    case 'espn':
      return '🔴'
    default:
      return '🏈'
  }
}

function buildReferralUrl(userName: string) {
  if (typeof window === 'undefined') return ''
  const encodedRef = encodeURIComponent(userName.trim().toLowerCase().replace(/\s+/g, '-'))
  return `${window.location.origin}/signup?ref=${encodedRef}`
}

function RankingWidget({
  leagues,
  onTriggerImport,
}: {
  leagues: UserLeague[]
  onTriggerImport: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<RankPayload | null>(null)

  useEffect(() => {
    let active = true

    fetch('/api/user/rank', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Failed to load ranking'))))
      .then((data: RankPayload) => {
        if (!active) return
        setPayload(data)
      })
      .catch(() => {
        if (!active) return
        setPayload({ imported: false, rank: null, overviewProfile: null })
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const connectedPlatforms = useMemo(() => {
    return Array.from(new Set(leagues.map((league) => league.platform.toLowerCase()))).slice(0, 5)
  }, [leagues])

  if (loading) {
    return <div className="h-[188px] rounded-2xl border-l-2 border-cyan-500 bg-white/5 animate-pulse" />
  }

  if (!payload?.imported || !payload.rank) {
    return (
      <div className="rounded-2xl border border-white/8 border-l-2 border-l-cyan-500 bg-[#0c0c1e] p-5">
        <div className="text-2xl">🏆</div>
        <p className="mt-3 text-sm font-semibold text-white">Complete your import to unlock your ranking</p>
        <button
          type="button"
          onClick={onTriggerImport}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300"
        >
          Import Now
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    )
  }

  const xp = Number(payload.rank.careerXp)
  const currentTierIndex = Math.max(0, Math.min(9, payload.rank.careerTier - 1))
  const currentThreshold = currentTierIndex * 1500
  const nextThreshold = Math.min(15000, currentThreshold + 1500)
  const progress =
    nextThreshold > currentThreshold
      ? Math.min(100, Math.max(0, ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100))
      : 100

  const totals =
    payload.overviewProfile?.lanes?.reduce(
      (acc, lane) => ({
        wins: acc.wins + Number(lane.wins || 0),
        losses: acc.losses + Number(lane.losses || 0),
        ties: acc.ties + Number(lane.ties || 0),
      }),
      { wins: 0, losses: 0, ties: 0 }
    ) ?? { wins: 0, losses: 0, ties: 0 }

  const record = `${totals.wins}-${totals.losses}${totals.ties ? `-${totals.ties}` : ''}`
  const careerRecord =
    payload.rank.totalWins != null && payload.rank.totalLosses != null
      ? `${payload.rank.totalWins}-${payload.rank.totalLosses}${
          (payload.rank.totalTies ?? 0) > 0 ? `-${payload.rank.totalTies}` : ''
        }`
      : record

  return (
    <>
      <div className="rounded-2xl border border-white/8 border-l-2 border-l-cyan-500 bg-[#0c0c1e] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400 bg-clip-text text-5xl font-black text-transparent">
              {payload.rank.careerTier}
            </div>
            <p className="mt-2 text-sm font-semibold text-white/80">{payload.rank.careerTierName}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {connectedPlatforms.map((platform) => (
                <span
                  key={platform}
                  className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px]"
                >
                  {getPlatformBadge(platform)}
                </span>
              ))}
            </div>
          </div>
          {/* AI GRADE BADGE */}
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <div className="min-w-[56px] rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-center">
              <div className="text-2xl font-black leading-none text-violet-300">{payload.rank.aiReportGrade}</div>
              <div className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-white/35">AI Grade</div>
            </div>
            <div className="text-center">
              <span className="text-sm font-bold text-white/80">{payload.rank.aiScore}</span>
              <span className="text-[10px] text-white/30">/100</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[11px] text-white/45">
            <span>{xp.toLocaleString()} / {nextThreshold.toLocaleString()} XP</span>
            <span>Level {payload.rank.careerLevel}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-white/60">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
            <span className="block text-[9px] uppercase tracking-wide text-white/35">Record</span>
            {careerRecord}
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
            <span className="block text-[9px] uppercase tracking-wide text-white/35">Titles</span>
            {payload.rank.championshipCount}
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
            <span className="block text-[9px] uppercase tracking-wide text-white/35">Seasons</span>
            {payload.rank.seasonsPlayed}
          </div>
        </div>

        <Link
          href="/dashboard/rankings"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300"
        >
          View full rankings
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <LegacyImportProgressWidget />
    </>
  )
}

export function DashboardOverview({
  userName,
  leagues,
  onTriggerImport,
  onOpenChimmy,
}: DashboardOverviewProps) {
  const { hasPro } = useEntitlements()
  const [onboarding, setOnboarding] = useState<OnboardingState>(getDefaultOnboardingState())
  /** UI-only per session — not persisted */
  const [checklistExpanded, setChecklistExpanded] = useState(false)
  const [lineupModalOpen, setLineupModalOpen] = useState(false)
  const [lineupData, setLineupData] = useState<LineupCheckPayload | null>(null)
  const [lineupLoading, setLineupLoading] = useState(false)

  const [waiverModalOpen, setWaiverModalOpen] = useState(false)
  const [waiverData, setWaiverData] = useState<WaiverDashboardResponse | null>(null)
  const [waiverLoading, setWaiverLoading] = useState(false)

  const [tradeModalOpen, setTradeModalOpen] = useState(false)
  const [tradeData, setTradeData] = useState<TradesDashboardResponse | null>(null)
  const [tradeLoading, setTradeLoading] = useState(false)

  const lineupFetchedAt = useRef<number | null>(null)
  const waiverFetchedAt = useRef<number | null>(null)
  const tradeFetchedAt = useRef<number | null>(null)


  useEffect(() => {
    setOnboarding(readOnboardingState())
  }, [])

  const updateOnboardingStep = (step: keyof OnboardingState, value = true) => {
    setOnboarding((current) => {
      const next = { ...current, [step]: value }
      writeOnboardingState(next)
      return next
    })
  }

  const checklistSteps = useMemo<ChecklistStep[]>(
    () => [
      {
        id: 'step1',
        label: 'Select favorite sports',
        description: 'Tell AllFantasy which sports you care about most.',
        done: onboarding.step1,
        ctaHref: '/settings?tab=sports',
        ctaLabel: 'Open',
      },
      {
        id: 'step2',
        label: 'Connect a platform',
        description: 'Import your history and unlock your dashboard ranking.',
        done: onboarding.step2,
        ctaLabel: 'Import',
      },
      {
        id: 'step3',
        label: 'Join or create a league',
        description: 'Get into a league so the shell can open league mode.',
        done: onboarding.step3,
        ctaHref: '/dashboard/rankings',
        ctaLabel: 'Explore',
      },
      {
        id: 'step4',
        label: 'Try an AI action',
        description: 'Open Chimmy and ask for your first piece of guidance.',
        done: onboarding.step4,
        ctaLabel: 'Open',
      },
      {
        id: 'step5',
        label: 'Invite a friend',
        description: 'Share your AllFantasy invite link with another manager.',
        done: onboarding.step5,
        ctaLabel: 'Copy',
      },
    ],
    [onboarding]
  )

  const completedCount = checklistSteps.filter((step) => step.done).length
  const allDone = completedCount === checklistSteps.length

  const handleImport = () => {
    updateOnboardingStep('step2')
    onTriggerImport()
  }

  const handleOpenChimmy = () => {
    updateOnboardingStep('step4')
    onOpenChimmy()
  }

  const handleCopyReferral = async () => {
    const referralUrl = buildReferralUrl(userName)
    if (!referralUrl) return

    try {
      await navigator.clipboard.writeText(referralUrl)
      updateOnboardingStep('step5')
    } catch {}
  }

  const handleLineupIssuesClick = useCallback(() => {
    setLineupModalOpen(true)
    const now = Date.now()
    const fresh =
      lineupData !== null &&
      lineupFetchedAt.current !== null &&
      now - lineupFetchedAt.current < STRIP_FETCH_STALE_MS
    if (fresh) return
    setLineupLoading(true)
    void fetch('/api/lineup-check', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('lineup-check'))))
      .then((data: LineupCheckPayload) => {
        setLineupData(data)
        lineupFetchedAt.current = Date.now()
      })
      .catch(() => {
        setLineupData({ totalIssues: 0, leagues: [], scannedLeagues: 0 })
        lineupFetchedAt.current = Date.now()
      })
      .finally(() => setLineupLoading(false))
  }, [lineupData])

  const handleWaiverClick = useCallback(() => {
    setWaiverModalOpen(true)
    const now = Date.now()
    const fresh =
      waiverData !== null &&
      waiverFetchedAt.current !== null &&
      now - waiverFetchedAt.current < STRIP_FETCH_STALE_MS
    if (fresh) return
    setWaiverLoading(true)
    void fetch('/api/dashboard/waivers', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('waivers'))))
      .then((d: WaiverDashboardResponse) => {
        setWaiverData(d)
        waiverFetchedAt.current = Date.now()
      })
      .catch(() => {
        setWaiverData({ totalLeagues: 0, recommendations: [] })
        waiverFetchedAt.current = Date.now()
      })
      .finally(() => setWaiverLoading(false))
  }, [waiverData])

  const handleTradeClick = useCallback(() => {
    setTradeModalOpen(true)
    const now = Date.now()
    const fresh =
      tradeData !== null &&
      tradeFetchedAt.current !== null &&
      now - tradeFetchedAt.current < STRIP_FETCH_STALE_MS
    if (fresh) return
    setTradeLoading(true)
    void fetch('/api/dashboard/trades', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('trades'))))
      .then((d: TradesDashboardResponse) => {
        setTradeData(d)
        tradeFetchedAt.current = Date.now()
      })
      .catch(() => {
        setTradeData({ totalPending: 0, trades: [] })
        tradeFetchedAt.current = Date.now()
      })
      .finally(() => setTradeLoading(false))
  }, [tradeData])

  useEffect(() => {
    if (!lineupModalOpen && !waiverModalOpen && !tradeModalOpen) return
    const interval = window.setInterval(() => {
      if (lineupModalOpen) {
        void fetch('/api/lineup-check', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((d: LineupCheckPayload | null) => {
            if (d) {
              setLineupData(d)
              lineupFetchedAt.current = Date.now()
            }
          })
          .catch(() => {})
      }
      if (waiverModalOpen) {
        void fetch('/api/dashboard/waivers', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((d: WaiverDashboardResponse | null) => {
            if (d) {
              setWaiverData(d)
              waiverFetchedAt.current = Date.now()
            }
          })
          .catch(() => {})
      }
      if (tradeModalOpen) {
        void fetch('/api/dashboard/trades', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((d: TradesDashboardResponse | null) => {
            if (d) {
              setTradeData(d)
              tradeFetchedAt.current = Date.now()
            }
          })
          .catch(() => {})
      }
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [lineupModalOpen, waiverModalOpen, tradeModalOpen])

  const lineupChipState =
    lineupData === null ? 'preview' : lineupData.totalIssues > 0 ? 'issues' : 'clear'
  const lineupChipCount = lineupData === null ? leagues.length : lineupData.totalIssues

  const waiverChipCount = useMemo(() => {
    if (!waiverData?.recommendations?.length) return 0
    return waiverData.recommendations.reduce((n, r) => n + (r.pickups?.length ?? 0), 0)
  }, [waiverData])

  const pendingTradeChipCount = tradeData?.totalPending ?? 0

  const handleAiShortcut = useCallback((_prompt: string) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('af-dashboard-focus-left-chimmy'))
    window.dispatchEvent(new CustomEvent('af-dashboard-open-mobile-left'))
  }, [])

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto [scrollbar-gutter:stable]">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        {allDone ? (
          <p className="text-xs text-cyan-400/95">
            ✓ All set! You&apos;re ready to get the most out of AllFantasy.
          </p>
        ) : checklistExpanded ? (
          <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#0c0c1e]">
            <button
              type="button"
              onClick={() => setChecklistExpanded(false)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div>
                <p className="text-sm font-bold text-white">Get Started</p>
                <p className="mt-1 text-xs text-white/40">{completedCount} of 5 complete</p>
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
                      step.id === 'step2' ? (
                        <button
                          type="button"
                          onClick={handleImport}
                          className="text-xs font-semibold text-cyan-400 hover:underline"
                        >
                          {step.ctaLabel}
                        </button>
                      ) : step.id === 'step4' ? (
                        <button
                          type="button"
                          onClick={handleOpenChimmy}
                          className="text-xs font-semibold text-cyan-400 hover:underline"
                        >
                          {step.ctaLabel}
                        </button>
                      ) : step.id === 'step5' ? (
                        <button
                          type="button"
                          onClick={() => void handleCopyReferral()}
                          className="text-xs font-semibold text-cyan-400 hover:underline"
                        >
                          {step.ctaLabel}
                        </button>
                      ) : step.ctaHref ? (
                        <Link
                          href={step.ctaHref}
                          onClick={() => {
                            if (step.id === 'step1') updateOnboardingStep('step1')
                            if (step.id === 'step3') updateOnboardingStep('step3')
                          }}
                          className="text-xs font-semibold text-cyan-400 hover:underline"
                        >
                          {step.ctaLabel}
                        </Link>
                      ) : null
                    ) : null}
                  </div>
                ))}
            </div>
          </section>
        ) : (
          <button
            type="button"
            onClick={() => setChecklistExpanded(true)}
            className="flex h-10 w-full cursor-pointer items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 text-[12px] text-white/50 transition hover:bg-white/[0.06]"
          >
            <span>
              Setup · <span className="text-white/80">{completedCount}/5</span> complete
            </span>
            <span
              className="text-white/40 transition-transform"
              aria-hidden
            >
              ›
            </span>
          </button>
        )}

        <section className="border-b border-white/[0.07] pb-5">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-white/30">Dashboard Overview</p>
          <h1 className="mt-2 text-[22px] font-black leading-tight text-white">
            Welcome back, <span className="font-bold text-cyan-400">{userName}</span>
          </h1>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/create-league"
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-2 text-sm font-semibold text-black"
            >
              + Create League
            </Link>
            <button
              type="button"
              onClick={handleImport}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white"
            >
              Import
            </button>
            <Link
              href="/find-league"
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white"
            >
              Find League
            </Link>
            {/* Dispersal drafts link removed from dashboard overview */}
          </div>
        </section>

        <TodayStrip
          leagues={leagues}
          lineupChipState={lineupChipState}
          lineupCount={lineupChipCount}
          onLineupIssuesClick={handleLineupIssuesClick}
          waiverCount={waiverChipCount}
          onWaiverClick={handleWaiverClick}
          pendingTradeCount={pendingTradeChipCount}
          onTradesClick={handleTradeClick}
        />

        <AIShortcutsGrid leagueName={leagues[0]?.name} onShortcut={handleAiShortcut} />

        <RankingsCard
          onAskChimmy={() => {
            handleAiShortcut('Show me how player rankings work for my leagues.')
            window.dispatchEvent(
              new CustomEvent('af-chimmy-shortcut', {
                detail: { prompt: 'Show me how player rankings work for my leagues.' },
              })
            )
          }}
        />

        <section>
          <RankingWidget leagues={leagues} onTriggerImport={handleImport} />
        </section>
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
    </div>
  )
}

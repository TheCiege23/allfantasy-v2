'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChecklistStep, UserLeague } from '../types'
import { AIShortcutsGrid } from './AIShortcutsGrid'
import { LeagueHubCard } from './LeagueHubCard'
import { TodayStrip } from './TodayStrip'

const ONBOARDING_KEY = 'af-onboarding-v1'

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

  return (
    <div className="rounded-2xl border border-white/8 border-l-2 border-l-cyan-500 bg-[#0c0c1e] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400 bg-clip-text text-5xl font-black text-transparent">
            {payload.rank.careerTier}
          </div>
          <p className="mt-2 text-sm font-semibold text-white/80">{payload.rank.careerTierName}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
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
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">{record}</div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
          {payload.rank.championshipCount} championships
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
          {payload.rank.seasonsPlayed} leagues
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
  )
}

export function DashboardOverview({
  userName,
  leagues,
  onTriggerImport,
  onOpenChimmy,
}: DashboardOverviewProps) {
  const [onboarding, setOnboarding] = useState<OnboardingState>(getDefaultOnboardingState())
  /** UI-only per session — not persisted */
  const [checklistExpanded, setChecklistExpanded] = useState(false)

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

  const visibleLeagues = leagues.slice(0, 6)

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
          <p className="text-[10px] uppercase tracking-[0.08em] text-white/30">Dashboard Overview</p>
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
          </div>
        </section>

        <TodayStrip leagues={leagues} />

        <AIShortcutsGrid leagueName={leagues[0]?.name} onShortcut={handleAiShortcut} />

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-normal uppercase tracking-widest text-white/30">Your Leagues</p>
            <Link href="/dashboard" className="text-[12px] text-white/40 transition hover:text-white/60">
              View all
            </Link>
          </div>

          {visibleLeagues.length === 0 ? (
            <button
              type="button"
              onClick={handleImport}
              className="w-full rounded-2xl border border-dashed border-white/[0.12] bg-[#0c0c1e] px-4 py-6 text-center text-sm font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/[0.03]"
            >
              + Import or create your first league
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              {visibleLeagues.map((league) => (
                <LeagueHubCard key={league.id} league={league} onClick={() => {}} />
              ))}
            </div>
          )}
        </section>

        <section>
          <RankingWidget leagues={leagues} onTriggerImport={handleImport} />
        </section>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { type ReactNode, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bot,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCircle2,
} from 'lucide-react'
import type { OnboardingChecklistState, RetentionNudge } from '@/lib/onboarding-retention/types'
import { getSportSectionLabel } from '@/lib/dashboard'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import LeaguePulseCard from '@/components/decision-os/LeaguePulseCard'
import { buildDashboardLeaguePulse } from '@/lib/decision-os/league-pulse'
import type { DashboardConnectedLeague } from './types'

export interface DashboardOverviewProps {
  onboardingComplete?: boolean
  checklistState?: OnboardingChecklistState | null
  retentionNudges?: RetentionNudge[]
  user: {
    id: string
    username: string | null
    displayName: string | null
    email: string
    emailVerified: boolean
    avatarUrl: string | null
  }
  profile: {
    sleeperUsername: string | null
    isVerified: boolean
    isAgeConfirmed: boolean
    profileComplete: boolean
  }
  leagues: {
    id: string
    name: string
    tournamentId: string
    joinCode?: string | null
    memberCount: number
    leagueTier: number
    inTierRange: boolean
  }[]
  entries: {
    id: string
    name: string
    tournamentId: string
    score: number
  }[]
  connectedLeagues?: DashboardConnectedLeague[]
  userCareerTier?: number
  isAdmin?: boolean
  initialDashboardPayload?: unknown
}

type ChecklistStep = {
  id: string
  label: string
  description: string
  done: boolean
  ctaHref?: string
  ctaLabel?: string
}

function getDisplayName(user: DashboardOverviewProps['user']) {
  return user.displayName || user.username || user.email.split('@')[0] || 'Manager'
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'AF'
}

function getSportEmoji(sport: string) {
  switch (normalizeToSupportedSport(sport)) {
    case 'NFL':
      return '🏈'
    case 'NBA':
      return '🏀'
    case 'NHL':
      return '🏒'
    case 'MLB':
      return '⚾'
    case 'NCAAF':
      return '🎓'
    case 'NCAAB':
      return '🏆'
    case 'SOCCER':
      return '⚽'
    default:
      return '🏟️'
  }
}

function formatTierHeadline(userCareerTier?: number) {
  const tier = Number.isFinite(Number(userCareerTier)) ? Math.max(1, Math.floor(Number(userCareerTier))) : 1
  if (tier <= 2) return `Tier ${tier} · Elite`
  if (tier <= 4) return `Tier ${tier} · Pro`
  if (tier <= 7) return `Tier ${tier} · Contender`
  return `Tier ${tier} · Rising`
}

function buildChecklistSteps(
  checklistState: OnboardingChecklistState | null | undefined,
  profileComplete: boolean,
  connectedLeagueCount: number
): ChecklistStep[] {
  const taskMap = new Map((checklistState?.tasks ?? []).map((task) => [task.id, task]))

  return [
    {
      id: 'import-league',
      label: 'Import a league from Sleeper, Yahoo, ESPN, or Fantrax',
      description: 'Connect at least one league so the hub can switch into league mode.',
      done: connectedLeagueCount > 0 || Boolean(taskMap.get('join_or_create_league')?.completed),
      ctaHref: '/import',
      ctaLabel: 'Import',
    },
    {
      id: 'profile',
      label: 'Set up your profile',
      description: 'Finish profile basics so tools, chat, and onboarding stay personalized.',
      done: profileComplete,
      ctaHref: '/settings',
      ctaLabel: 'Profile',
    },
    {
      id: 'invite',
      label: 'Invite your league',
      description: 'Open a league in the new hub and copy the invite link from the Draft tab.',
      done: Boolean(taskMap.get('referral_share')?.completed),
      ctaHref: '/dashboard',
      ctaLabel: 'Open hub',
    },
    {
      id: 'first-ai',
      label: 'Run your first AI analysis',
      description: 'Use Chimmy, Trade Analyzer, Waiver AI, or Season Strategy.',
      done: Boolean(taskMap.get('first_ai_action')?.completed),
      ctaHref: '/tools-hub',
      ctaLabel: 'Open AI',
    },
  ]
}

function GetStartedChecklist({ steps }: { steps: ChecklistStep[] }) {
  const [expanded, setExpanded] = useState(true)
  const allDone = steps.every((step) => step.done)

  if (allDone) {
    return (
      <div className="card-premium px-4 py-3 text-right text-xs text-muted">
        Setup complete ·{' '}
        <Link href="/settings" className="font-semibold text-brand-primary hover:text-brand-strong">
          Settings
        </Link>
      </div>
    )
  }

  return (
    <section className="card-premium overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-bold text-primary">Get Started</p>
          <p className="mt-0.5 text-xs text-muted">
            Complete the core setup flow to unlock the full league hub.
          </p>
        </div>
        <span className="text-lg text-muted">{expanded ? '-' : '+'}</span>
      </button>

      {expanded ? (
        <div className="border-t border-subtle">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 border-b border-subtle px-4 py-3 last:border-b-0 ${
                step.done ? 'opacity-60' : ''
              }`}
            >
              <div
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                  step.done
                    ? 'border-status-success bg-status-success text-content-inverse'
                    : 'border-subtle text-muted'
                }`}
              >
                {step.done ? '✓' : ''}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-primary">{step.label}</p>
                <p className="mt-0.5 text-xs text-muted">{step.description}</p>
              </div>
              {!step.done && step.ctaHref ? (
                <Link
                  href={step.ctaHref}
                  className="rounded-full border border-brand-primary/25 bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-primary hover:bg-brand-primary/15"
                >
                  {step.ctaLabel ?? 'Start'}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function ToolCard({
  href,
  title,
  description,
  icon,
}: {
  href: string
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <Link
      href={href}
      className="card-premium block p-4 transition hover:border-brand-primary/25 hover:bg-surface-hover"
    >
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary">
        {icon}
      </div>
      <p className="mt-4 text-base font-bold text-primary">{title}</p>
      <p className="mt-1 text-sm text-secondary">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-primary">
        Open
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  )
}

export default function DashboardContent({
  checklistState = null,
  retentionNudges = [],
  user,
  profile,
  entries,
  connectedLeagues = [],
  userCareerTier,
}: DashboardOverviewProps) {
  const displayName = getDisplayName(user)
  const checklistSteps = useMemo(
    () => buildChecklistSteps(checklistState, profile.profileComplete, connectedLeagues.length),
    [checklistState, connectedLeagues.length, profile.profileComplete]
  )
  const leaguePulse = useMemo(
    () => buildDashboardLeaguePulse({ connectedLeagues, entryCount: entries.length }),
    [connectedLeagues, entries.length]
  )
  const tierHeadline = formatTierHeadline(userCareerTier)

  return (
    <div className="min-h-full overflow-x-hidden bg-app p-4 text-primary md:p-5">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="card-premium p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary">
                Dashboard overview
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-primary md:text-4xl">
                Welcome back, {displayName}
              </h1>
              <p className="mt-2 text-sm text-secondary md:text-base">
                Pick a league from the left rail to open the new league hub, or stay here for your
                profile, AI, and onboarding overview.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/create-league"
                className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-primary px-4 py-2 text-sm font-bold text-content-inverse hover:bg-brand-strong"
              >
                Create League
              </Link>
              <Link
                href="/import?returnTo=/dashboard"
                className="inline-flex min-h-[44px] items-center rounded-xl border border-subtle bg-surface-muted px-4 py-2 text-sm font-semibold text-primary hover:bg-surface-hover"
              >
                Import League
              </Link>
              <Link
                href="/tools-hub"
                className="inline-flex min-h-[44px] items-center rounded-xl border border-subtle bg-surface-muted px-4 py-2 text-sm font-semibold text-primary hover:bg-surface-hover"
              >
                Open AI Tools
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-subtle bg-surface-muted p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-hover text-sm font-black text-primary">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
                  ) : (
                    getInitials(displayName)
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">{displayName}</p>
                  <p className="text-xs text-muted">{user.email}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-subtle bg-surface px-3 py-1 text-secondary">
                  {tierHeadline}
                </span>
                <span className="rounded-full border border-subtle bg-surface px-3 py-1 text-secondary">
                  {profile.isVerified ? 'Verified' : 'Needs verification'}
                </span>
                <span className="rounded-full border border-subtle bg-surface px-3 py-1 text-secondary">
                  {profile.profileComplete ? 'Profile complete' : 'Profile setup pending'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-subtle bg-surface-muted p-4">
              <p
                className="text-xs uppercase tracking-[0.16em] text-muted"
                data-testid="dashboard-connected-leagues-heading"
              >
                Connected leagues
              </p>
              <p className="mt-2 text-3xl font-black text-primary">{connectedLeagues.length}</p>
              <p className="mt-1 text-sm text-secondary">
                League hub is ready for every imported league with a unified record.
              </p>
            </div>

            <div className="rounded-2xl border border-subtle bg-surface-muted p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Tracked entries</p>
              <p className="mt-2 text-3xl font-black text-primary">{entries.length}</p>
              <p className="mt-1 text-sm text-secondary">
                Bracket and ranking history still lives here when you are not inside a league hub.
              </p>
            </div>
          </div>
        </section>

        <LeaguePulseCard pulse={leaguePulse} variant="dashboard" />

        <GetStartedChecklist steps={checklistSteps} />

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card-premium p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">League hub</p>
                <h2 className="mt-1 text-2xl font-black text-primary">Your connected leagues</h2>
              </div>
              <span className="rounded-full border border-subtle bg-surface-muted px-3 py-1 text-xs text-secondary">
                {connectedLeagues.length} ready
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {connectedLeagues.length ? (
                connectedLeagues.slice(0, 8).map((league) => {
                  const normalizedSport = normalizeToSupportedSport(league.sport)
                  return (
                    <div
                      key={league.sourceLeagueId}
                      className="flex items-center gap-3 rounded-2xl border border-subtle bg-surface-muted px-4 py-3"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-hover text-xl">
                        {getSportEmoji(league.sport)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-primary">{league.name}</p>
                        <p className="mt-1 text-xs text-muted">
                          {normalizedSport ? getSportSectionLabel(normalizedSport) : league.sport} ·{' '}
                          {league.teamCount} teams · {league.platform.toUpperCase()}
                        </p>
                      </div>
                      <span className="rounded-full border border-subtle bg-surface px-2.5 py-1 text-[11px] text-secondary">
                        {league.format}
                      </span>
                    </div>
                  )
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-subtle px-4 py-10 text-center text-sm text-muted">
                  Import a league to unlock the sidebar switcher and league-specific chat.
                </div>
              )}
            </div>
          </div>

          <div className="card-premium p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Recommended next</p>
            <h2 className="mt-1 text-2xl font-black text-primary">AI and strategy shortcuts</h2>
            <p className="mt-2 text-xs leading-5 text-muted">
              Decision tools should show confidence and source context when league data is available.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <ToolCard
                href="/trade-finder"
                title="Trade Finder"
                description="Find partner fits and package ideas from the hub."
                icon={<Sparkles className="h-5 w-5" />}
              />
              <ToolCard
                href="/waiver-ai"
                title="Waiver AI"
                description="Get pickup and FAAB help with live roster context."
                icon={<Bot className="h-5 w-5" />}
              />
              <ToolCard
                href="/season-strategy"
                title="Season Strategy"
                description="Build a full-year plan once your league is loaded."
                icon={<Trophy className="h-5 w-5" />}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="card-premium p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-300" />
              <h2 className="text-xl font-black text-primary">Profile and account</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-subtle bg-surface-muted p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Sleeper link</p>
                <p className="mt-2 text-sm font-bold text-primary">
                  {profile.sleeperUsername ? `@${profile.sleeperUsername}` : 'Not connected'}
                </p>
              </div>
              <div className="rounded-2xl border border-subtle bg-surface-muted p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Verification</p>
                <p className="mt-2 text-sm font-bold text-primary">
                  {profile.isVerified ? 'Verified' : 'Pending'}
                </p>
              </div>
              <div className="rounded-2xl border border-subtle bg-surface-muted p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Age confirmation</p>
                <p className="mt-2 text-sm font-bold text-primary">
                  {profile.isAgeConfirmed ? 'Confirmed' : 'Pending'}
                </p>
              </div>
              <div className="rounded-2xl border border-subtle bg-surface-muted p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Settings</p>
                <Link href="/settings" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-brand-primary">
                  Open profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="card-premium p-5">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-cyan-300" />
              <h2 className="text-xl font-black text-primary">Momentum</h2>
            </div>
            {retentionNudges.length ? (
              <div className="mt-4 space-y-3">
                {retentionNudges.slice(0, 3).map((nudge) => (
                  <Link
                    key={nudge.id}
                    href={nudge.href}
                    className="block rounded-2xl border border-subtle bg-surface-muted p-4 hover:bg-surface-hover"
                  >
                    <p className="text-sm font-bold text-primary">{nudge.title}</p>
                    <p className="mt-1 text-sm text-secondary">{nudge.body}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {entries.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-subtle bg-surface-muted p-4">
                    <p className="text-sm font-bold text-primary">{entry.name}</p>
                    <p className="mt-1 text-sm text-secondary">Score: {entry.score}</p>
                  </div>
                ))}
                {!entries.length ? (
                  <div className="rounded-2xl border border-dashed border-subtle px-4 py-10 text-center text-sm text-muted">
                    Use the left sidebar to open a league, or head to the tools hub for your first AI action.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <section className="card-premium p-5">
          <div className="flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-cyan-300" />
            <h2 className="text-xl font-black text-primary">League hub tips</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-subtle bg-surface-muted p-4">
              <p className="text-sm font-bold text-primary">Pick a league</p>
              <p className="mt-1 text-sm text-secondary">
                The left rail switches the center panel into draft, team, and league tabs without a full page jump.
              </p>
            </div>
            <div className="rounded-2xl border border-subtle bg-surface-muted p-4">
              <p className="text-sm font-bold text-primary">Use the draft tab</p>
              <p className="mt-1 text-sm text-secondary">
                Commissioners can create or copy invite links and jump into mock drafts or the live draft room.
              </p>
            </div>
            <div className="rounded-2xl border border-subtle bg-surface-muted p-4">
              <p className="text-sm font-bold text-primary">Open chat fast</p>
              <p className="mt-1 text-sm text-secondary">
                The right rail swaps between Chimmy and league chat so analysis and conversation stay side by side.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

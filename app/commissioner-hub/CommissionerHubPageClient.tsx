'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Crown,
  Plus,
  ArrowDownToLine,
  Mail,
  Target,
  Sparkles,
  FileText,
  Shield,
  ChevronRight,
  Trophy,
  ArrowRight,
  Users,
  Calendar,
  AlertCircle,
  Zap,
  MessageSquare,
  Activity,
  Settings,
  Flag,
  BookOpen,
  TrendingUp,
} from 'lucide-react'
import type { UserLeague } from '@/app/dashboard/types'
import CommissionerShowcasePanel from '@/components/redraft/CommissionerShowcasePanel'
import type {
  CommissionerHealthAction,
  CommissionerLeagueHealthSnapshot,
} from '@/lib/commissioner-hub/commissionerHubHealth'

// ─── Copy constants (future i18n wiring) ───────────────────────────────────
const COPY = {
  hero: {
    badge: 'Commissioner Hub',
    trustBadge: 'No gambling. Pure fantasy.',
    headline1: 'Run better leagues.',
    headline2: 'Build your legacy.',
    sub: 'Built for commissioners. Loved by managers. Every tool you need to create, grow, and manage your fantasy empire — all in one place.',
    sub2: 'Draft smarter. Keep members engaged. Move entire leagues onto AllFantasy.',
    ctaCreate: 'Create a League',
    ctaImport: 'Import League',
  },
  ops: {
    sectionLabel: 'League Operations',
    totalManaged: 'Leagues Managed',
    needsSetup: 'Needs Setup',
    missingDraft: 'Missing Draft Date',
    active: 'Active Now',
  },
  health: {
    sectionLabel: 'League Setup Health',
    membersLabel: 'members',
    draftLabel: 'Draft',
    noDraftDate: 'No draft date set',
    viewLeague: 'View League',
  },
  queue: {
    sectionLabel: 'Commissioner Mission Queue',
    sectionHint: 'Highest-priority actions for your leagues',
  },
  ai: {
    sectionLabel: 'Commissioner AI Prompts',
    sectionHint: 'Ask Chimmy to do the heavy lifting',
  },
  migration: {
    sectionLabel: 'Migration Center',
    sectionHint: 'Bring your leagues to AllFantasy',
    activeLabel: 'Active',
    legacyLabel: 'Legacy',
    comingSoonLabel: 'Coming Soon',
    importCta: 'Import →',
  },
  memberLeagues: {
    sectionLabel: 'Leagues I Play In',
  },
  trust: {
    heading: 'Transparent. Strategy-first. No gambling.',
    body1:
      'AllFantasy is built for fantasy sports strategy — not sportsbook predictions or gambling. Every recommendation from our AI tools is grounded in public data and fantasy scoring logic.',
    body2:
      'Chimmy gives recommendations, not guarantees. Fantasy sports involve real uncertainty. Use our tools to make smarter decisions, not to replace your own judgment.',
  },
  empty: {
    heading: 'No leagues yet.',
    sub: 'Create or import a league to get started as a commissioner.',
    ctaCreate: 'Create League',
    ctaImport: 'Import',
  },
}

// ─── Types ──────────────────────────────────────────────────────────────────
type SetupStatus = {
  label: string
  dotClass: string
  badgeClass: string
}

type NextAction = {
  label: string
  href: string
  variant: 'amber' | 'cyan' | 'emerald' | 'muted'
}

type QueueCard = {
  key: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  href: string
  priority: number
  cardClass: string
  iconClass: string
  badge?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const ACTION_VARIANT_CLASSES: Record<NextAction['variant'], string> = {
  amber:
    'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
  cyan: 'border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-300 hover:bg-cyan-500/15',
  emerald:
    'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300 hover:bg-emerald-500/15',
  muted:
    'border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]',
}

function buildLoginHref(path: string): string {
  return `/login?callbackUrl=${encodeURIComponent(path)}`
}

function resolveSetupStatus(league: UserLeague): SetupStatus {
  const state = (league.lifecycleState ?? league.status ?? '').toLowerCase()
  if (state === 'setup' || state === '')
    return {
      label: 'Needs Setup',
      dotClass: 'bg-amber-400',
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    }
  if (state === 'pre_draft')
    return {
      label: 'Pre-Draft',
      dotClass: 'bg-cyan-400',
      badgeClass: 'border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-300',
    }
  if (state === 'drafting')
    return {
      label: 'Drafting',
      dotClass: 'bg-violet-400 animate-pulse',
      badgeClass: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
    }
  if (state === 'in_season' || state === 'playoffs')
    return {
      label: state === 'playoffs' ? 'Playoffs' : 'In Season',
      dotClass: 'bg-emerald-400',
      badgeClass:
        'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300',
    }
  if (state === 'completed' || state === 'offseason')
    return {
      label: 'Offseason',
      dotClass: 'bg-white/25',
      badgeClass: 'border-white/10 bg-white/[0.03] text-white/40',
    }
  return {
    label: 'Active',
    dotClass: 'bg-emerald-400',
    badgeClass: 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300',
  }
}

function resolveNextAction(league: UserLeague): NextAction {
  const state = (league.lifecycleState ?? league.status ?? '').toLowerCase()
  if (state === 'setup' || state === '')
    return { label: 'Complete Setup', href: `/league/${league.id}`, variant: 'amber' }
  if (state === 'pre_draft' && !league.draftDate)
    return { label: 'Set Draft Date', href: `/league/${league.id}`, variant: 'amber' }
  if (state === 'pre_draft')
    return { label: 'View Draft Room', href: `/war-room`, variant: 'cyan' }
  if (state === 'drafting')
    return { label: 'Enter Draft', href: `/war-room`, variant: 'emerald' }
  if (state === 'in_season' || state === 'playoffs')
    return { label: 'Manage League', href: `/league/${league.id}`, variant: 'emerald' }
  return { label: 'View League', href: `/league/${league.id}`, variant: 'muted' }
}

function buildMissionQueue(commLeagues: UserLeague[]): QueueCard[] {
  const needsDraft = commLeagues.some(
    (l) =>
      (l.lifecycleState ?? l.status ?? '').toLowerCase() === 'pre_draft' && !l.draftDate,
  )
  const needsSetup = commLeagues.some(
    (l) => (l.lifecycleState ?? l.status ?? '').toLowerCase() === 'setup' || (l.lifecycleState ?? l.status ?? '') === '',
  )

  const cards: QueueCard[] = [
    {
      key: 'create',
      icon: Plus,
      title: 'Create League',
      desc: 'Launch a new NFL, NBA, MLB, or multi-sport league in minutes.',
      href: '/create-league',
      priority: needsSetup ? 0 : 1,
      cardClass:
        'border-cyan-500/30 bg-gradient-to-br from-cyan-500/[0.10] to-transparent hover:border-cyan-500/45',
      iconClass: 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300',
      badge: commLeagues.length === 0 ? 'Start Here' : undefined,
    },
    {
      key: 'import',
      icon: ArrowDownToLine,
      title: 'Import League',
      desc: 'Bring your Sleeper, ESPN, Yahoo, or MFL league to AllFantasy in under 2 minutes.',
      href: '/import',
      priority: 2,
      cardClass:
        'border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.07] to-transparent hover:border-emerald-500/40',
      iconClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    },
    {
      key: 'draft',
      icon: Target,
      title: 'Draft Readiness',
      desc: 'Check lineup health, set draft order, and confirm settings before draft day.',
      href: '/war-room',
      priority: needsDraft ? 0 : 3,
      cardClass:
        'border-amber-500/25 bg-gradient-to-br from-amber-500/[0.07] to-transparent hover:border-amber-500/40',
      iconClass: 'border-amber-500/35 bg-amber-500/10 text-amber-300',
      badge: needsDraft ? 'Action Needed' : undefined,
    },
    {
      key: 'invites',
      icon: Mail,
      title: 'Send Invites',
      desc: 'Recruit managers and fill your league roster with one shareable link.',
      href: '/import',
      priority: 4,
      cardClass:
        'border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] to-transparent hover:border-violet-500/35',
      iconClass: 'border-violet-500/35 bg-violet-500/10 text-violet-300',
    },
    {
      key: 'ai',
      icon: Sparkles,
      title: 'Ask Commissioner AI',
      desc: 'Get AI-powered advice on rules, disputes, waiver settings, and league health.',
      href: '/ai/tools',
      priority: 5,
      cardClass:
        'border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] to-transparent hover:border-violet-500/40',
      iconClass: 'border-violet-500/40 bg-violet-500/15 text-violet-300',
      badge: 'AI',
    },
    {
      key: 'recap',
      icon: FileText,
      title: 'Generate Weekly Recap',
      desc: 'Auto-generate a shareable league recap to keep your managers engaged all season.',
      href: '/ai/tools',
      priority: 6,
      cardClass:
        'border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.06] to-transparent hover:border-cyan-500/35',
      iconClass: 'border-cyan-500/30 bg-cyan-500/[0.08] text-cyan-400',
      badge: 'Beta',
    },
    {
      key: 'settings',
      icon: Settings,
      title: 'League Settings',
      desc: 'Review scoring rules, waiver priority, roster limits, and trade deadlines.',
      href: commLeagues[0] ? `/league/${commLeagues[0].id}` : '/dashboard',
      priority: 7,
      cardClass:
        'border-white/[0.08] bg-gradient-to-br from-white/[0.02] to-transparent hover:border-white/[0.14]',
      iconClass: 'border-white/10 bg-white/[0.04] text-white/50',
    },
  ]

  return cards.sort((a, b) => a.priority - b.priority)
}

// ─── AI Prompt Cards ─────────────────────────────────────────────────────────
const AI_PROMPT_CARDS = [
  {
    key: 'announce',
    icon: Flag,
    title: 'Write Draft Announcement',
    desc: 'Generate a league-wide message to hype up your draft day.',
    href: '/ai/tools',
  },
  {
    key: 'explain',
    icon: BookOpen,
    title: 'Explain League Settings',
    desc: 'Get a plain-English breakdown of scoring rules, waivers, and trades for your managers.',
    href: '/ai/tools',
  },
  {
    key: 'recap',
    icon: FileText,
    title: 'Weekly Recap Generator',
    desc: 'Auto-write a shareable recap covering top performers, trades, and standings.',
    href: '/ai/tools',
    badge: 'Beta',
  },
  {
    key: 'engage',
    icon: Zap,
    title: 'Engagement Ideas',
    desc: 'Get ideas to keep your managers active and chatting throughout the season.',
    href: '/ai/tools',
  },
  {
    key: 'dispute',
    icon: MessageSquare,
    title: 'Resolve Dispute',
    desc: 'Describe a trade dispute or rule question — Chimmy gives a fair, evidence-based ruling.',
    href: '/ai-chat',
  },
  {
    key: 'power',
    icon: TrendingUp,
    title: 'Power Rankings',
    desc: 'Generate weekly power rankings with short commentary for each team.',
    href: '/ai/tools',
    badge: 'Beta',
  },
]

// ─── Migration platforms ──────────────────────────────────────────────────────
const MIGRATION_PLATFORMS: {
  key: string
  name: string
  status: 'active' | 'legacy' | 'coming_soon'
  href: string | null
  desc: string
}[] = [
  {
    key: 'sleeper',
    name: 'Sleeper',
    status: 'active',
    href: '/import',
    desc: 'Full import — rosters, history, and settings.',
  },
  {
    key: 'espn',
    name: 'ESPN',
    status: 'active',
    href: '/import',
    desc: 'Full import — rosters, history, and settings.',
  },
  {
    key: 'yahoo',
    name: 'Yahoo',
    status: 'active',
    href: '/import',
    desc: 'Full import — rosters, history, and settings.',
  },
  {
    key: 'mfl',
    name: 'MFL',
    status: 'active',
    href: '/import',
    desc: 'Full import — rosters, history, and settings.',
  },
  {
    key: 'fantrax',
    name: 'Fantrax',
    status: 'legacy',
    href: '/import',
    desc: 'Legacy import — basic roster data only.',
  },
  {
    key: 'csv',
    name: 'CSV / Custom',
    status: 'coming_soon',
    href: null,
    desc: 'Upload a spreadsheet export from any platform.',
  },
]

const MIGRATION_STATUS_CLASSES: Record<string, { badge: string; dot: string }> = {
  active: {
    badge: 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300',
    dot: 'bg-emerald-400',
  },
  legacy: {
    badge: 'border-amber-500/25 bg-amber-500/[0.08] text-amber-300',
    dot: 'bg-amber-400',
  },
  coming_soon: {
    badge: 'border-white/10 bg-white/[0.03] text-white/35',
    dot: 'bg-white/20',
  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-2">
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">{label}</p>
      {hint && <p className="text-[11px] text-white/25">{hint}</p>}
    </div>
  )
}

function StatCard({
  value,
  label,
  accentClass,
  borderClass,
  alert,
}: {
  value: number
  label: string
  accentClass: string
  borderClass: string
  alert?: boolean
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-2xl border p-4 ${borderClass}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`text-[28px] font-black leading-none ${accentClass}`}>
          {value}
        </span>
        {alert && value > 0 && (
          <AlertCircle className="h-4 w-4 text-amber-400" aria-hidden />
        )}
      </div>
      <p className="text-[11px] text-white/45">{label}</p>
    </div>
  )
}

const HEALTH_STATUS_CLASSES: Record<string, string> = {
  excellent: 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300',
  healthy: 'border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-300',
  watch: 'border-amber-500/25 bg-amber-500/[0.08] text-amber-300',
  at_risk: 'border-orange-500/25 bg-orange-500/[0.08] text-orange-300',
  critical: 'border-rose-500/30 bg-rose-500/[0.10] text-rose-300',
}

const ACTION_TONE_CLASSES: Record<CommissionerHealthAction['tone'], string> = {
  standard: 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.06]',
  warning: 'border-amber-500/25 bg-amber-500/[0.08] text-amber-300 hover:bg-amber-500/[0.13]',
  danger: 'border-rose-500/25 bg-rose-500/[0.08] text-rose-300 hover:bg-rose-500/[0.13]',
}

function sumMetric(
  snapshots: CommissionerLeagueHealthSnapshot[],
  key: keyof CommissionerLeagueHealthSnapshot['metrics'],
): number {
  return snapshots.reduce((sum, snapshot) => sum + Number(snapshot.metrics[key] ?? 0), 0)
}

function averageMetric(
  snapshots: CommissionerLeagueHealthSnapshot[],
  key: keyof CommissionerLeagueHealthSnapshot['metrics'],
): number {
  if (snapshots.length === 0) return 0
  return Math.round(sumMetric(snapshots, key) / snapshots.length)
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function MetricTile({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  tone?: 'neutral' | 'good' | 'warn'
}) {
  const toneClass =
    tone === 'good'
      ? 'border-emerald-500/[0.16] bg-emerald-500/[0.04] text-emerald-300'
      : tone === 'warn'
        ? 'border-amber-500/[0.18] bg-amber-500/[0.05] text-amber-300'
        : 'border-white/[0.08] bg-white/[0.02] text-white/75'
  return (
    <div className={`flex min-h-[78px] flex-col justify-between rounded-2xl border p-3 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">{label}</p>
        <Icon className="h-3.5 w-3.5 text-current opacity-70" aria-hidden />
      </div>
      <p className="mt-2 text-[24px] font-black leading-none text-current">{value}</p>
    </div>
  )
}

function CommissionerActionLink({ action }: { action: CommissionerHealthAction }) {
  const className = action.enabled
    ? ACTION_TONE_CLASSES[action.tone]
    : 'cursor-not-allowed border-white/[0.06] bg-white/[0.015] text-white/25'

  if (!action.enabled) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${className}`}
        title={action.disabledReason}
      >
        <Settings className="h-3 w-3" aria-hidden />
        {action.label}
      </span>
    )
  }

  return (
    <Link
      href={action.href}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${className}`}
      title={action.requiresConfirmation ? 'Requires commissioner confirmation' : undefined}
    >
      <Settings className="h-3 w-3" aria-hidden />
      {action.label}
    </Link>
  )
}

function LeagueHealthDashboard({
  snapshots,
  demoMode = false,
}: {
  snapshots: CommissionerLeagueHealthSnapshot[]
  demoMode?: boolean
}) {
  const [showAll, setShowAll] = useState(false)
  if (snapshots.length === 0) return null
  const averageEngagement = averageMetric(snapshots, 'leagueEngagement')
  const averageProjectionCoverage = averageMetric(snapshots, 'projectionCoveragePct')
  const averageLineupRate =
    snapshots.reduce((sum, snapshot) => sum + snapshot.metrics.lineupSubmissionRate, 0) / snapshots.length
  const visibleSnapshots = showAll ? snapshots : snapshots.slice(0, 3)

  return (
    <section data-testid="commissioner-health-dashboard">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionHeader
          label="League Health Dashboard"
          hint={
            demoMode
              ? 'Preview-safe commissioner risk, activity, and engagement signals'
              : 'Live commissioner risk, activity, and engagement signals'
          }
        />
        {snapshots.length > 3 ? (
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/[0.07]"
          >
            {showAll ? 'Show fewer leagues' : `View all ${snapshots.length} leagues`}
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
        <MetricTile
          icon={Users}
          label="Inactive Teams"
          value={sumMetric(snapshots, 'inactiveTeams')}
          tone={sumMetric(snapshots, 'inactiveTeams') > 0 ? 'warn' : 'good'}
        />
        <MetricTile
          icon={AlertCircle}
          label="Missed Lineups"
          value={sumMetric(snapshots, 'missedLineups')}
          tone={sumMetric(snapshots, 'missedLineups') > 0 ? 'warn' : 'good'}
        />
        <MetricTile icon={TrendingUp} label="Trade Activity" value={sumMetric(snapshots, 'tradeActivity')} />
        <MetricTile icon={Zap} label="Waiver Activity" value={sumMetric(snapshots, 'waiverActivity')} />
        <MetricTile
          icon={Activity}
          label="League Engagement"
          value={`${averageEngagement}/100`}
          tone={averageEngagement >= 65 ? 'good' : 'warn'}
        />
        <MetricTile icon={Shield} label="Commissioner Actions" value={sumMetric(snapshots, 'commissionerActions')} />
        <MetricTile
          icon={Target}
          label="Projection Coverage"
          value={`${averageProjectionCoverage}%`}
          tone={averageProjectionCoverage >= 70 ? 'good' : 'warn'}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {visibleSnapshots.map((snapshot) => {
          const statusClass =
            HEALTH_STATUS_CLASSES[snapshot.overallStatus] ??
            'border-white/10 bg-white/[0.03] text-white/50'
          return (
            <article
              key={snapshot.leagueId}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-white/90">{snapshot.leagueName}</p>
                  <p className="mt-0.5 text-[11px] text-white/38">
                    {snapshot.sport} {snapshot.leagueType} · Week {snapshot.currentWeek} · {snapshot.teamCount} teams
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass}`}>
                  {snapshot.healthScore}/100
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <div className="rounded-xl border border-white/[0.06] bg-black/10 p-2">
                  <p className="text-[10px] text-white/35">Lineups</p>
                  <p className="text-[13px] font-bold text-white/80">{formatPercent(snapshot.metrics.lineupSubmissionRate)}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/10 p-2">
                  <p className="text-[10px] text-white/35">Pending Waivers</p>
                  <p className="text-[13px] font-bold text-white/80">{snapshot.metrics.pendingWaiverClaims}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/10 p-2">
                  <p className="text-[10px] text-white/35">Pending Trades</p>
                  <p className="text-[13px] font-bold text-white/80">{snapshot.metrics.pendingTrades}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/10 p-2">
                  <p className="text-[10px] text-white/35">Open AI Alerts</p>
                  <p className="text-[13px] font-bold text-white/80">{snapshot.metrics.openAiAlerts}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/10 p-2">
                  <p className="text-[10px] text-white/35">Projection Coverage</p>
                  <p className="text-[13px] font-bold text-white/80">{snapshot.metrics.projectionCoveragePct}%</p>
                </div>
              </div>

              <p className="mt-3 text-[12px] leading-relaxed text-white/48">{snapshot.summary}</p>

              {snapshot.alerts.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {snapshot.alerts.slice(0, 2).map((alert) => (
                    <p key={alert} className="rounded-lg border border-amber-500/15 bg-amber-500/[0.05] px-2.5 py-1.5 text-[11px] text-amber-200/80">
                      {alert}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Commissioner Actions</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {snapshot.actions.map((action) => (
                    <CommissionerActionLink key={action.key} action={action} />
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300/60">AI Commissioner Assistant</p>
                <div className="mt-2 grid gap-2">
                  {snapshot.assistantQuestions.slice(0, 5).map((question) => (
                    <Link
                      key={question.key}
                      href={`/ai-chat?leagueId=${encodeURIComponent(snapshot.leagueId)}&prompt=${encodeURIComponent(question.prompt)}`}
                      className="group rounded-xl border border-violet-500/[0.12] bg-violet-500/[0.035] px-3 py-2 transition hover:border-violet-500/25 hover:bg-violet-500/[0.06]"
                    >
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300/70" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white/72 group-hover:text-white/90">{question.label}</p>
                          <p className="mt-0.5 text-[11px] leading-snug text-white/38">{question.answer}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-white/25">
                <span>Source: {snapshot.source === 'database' ? 'Database' : 'Dashboard fallback'}</span>
                <span>Confidence: {snapshot.dataConfidence}</span>
              </div>
            </article>
          )
        })}
      </div>

      {!showAll && snapshots.length > visibleSnapshots.length ? (
        <p className="mt-3 text-[11px] text-white/30">
          Showing {visibleSnapshots.length} of {snapshots.length} managed leagues for presentation flow.
        </p>
      ) : null}

      <p className="mt-3 text-[11px] text-white/30">
        Average lineup submission across managed leagues: {formatPercent(averageLineupRate)}.
      </p>
    </section>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
type CommissionerHubPageClientProps = {
  leagues: UserLeague[]
  healthSnapshots: CommissionerLeagueHealthSnapshot[]
  demoMode?: boolean
  isAuthenticated?: boolean
}

export default function CommissionerHubPageClient({
  leagues,
  healthSnapshots,
  demoMode = false,
  isAuthenticated = false,
}: CommissionerHubPageClientProps) {
  const commissionerLeagues = leagues.filter((l) => l.isCommissioner)
  const memberLeagues = leagues.filter((l) => !l.isCommissioner)
  const missionQueue = buildMissionQueue(commissionerLeagues)
  const healthByLeagueId = new Map(healthSnapshots.map((snapshot) => [snapshot.leagueId, snapshot]))
  const managedHealthSnapshots = commissionerLeagues
    .map((league) => healthByLeagueId.get(league.id))
    .filter((snapshot): snapshot is CommissionerLeagueHealthSnapshot => Boolean(snapshot))
  const showDemoMode = demoMode || leagues.length === 0
  const primaryHeroHref = isAuthenticated ? '/create-league' : buildLoginHref('/commissioner-hub')
  const primaryHeroLabel = isAuthenticated ? COPY.hero.ctaCreate : 'Sign In'
  const secondaryHeroHref = isAuthenticated ? '/import' : buildLoginHref('/import')
  const secondaryHeroLabel = isAuthenticated ? COPY.hero.ctaImport : 'Sign In to Import'
  const emptyPrimaryHref = isAuthenticated ? '/create-league' : buildLoginHref('/commissioner-hub')
  const emptyPrimaryLabel = isAuthenticated ? COPY.empty.ctaCreate : 'Sign In'
  const emptySecondaryHref = isAuthenticated ? '/import' : buildLoginHref('/import')
  const emptySecondaryLabel = isAuthenticated ? COPY.empty.ctaImport : 'Sign In to Import'
  const emptyHeading = isAuthenticated ? COPY.empty.heading : 'Commissioner demo is ready.'
  const emptySub = isAuthenticated
    ? 'Create or import a league to replace the preview state with your real commissioner data.'
    : 'You can tour the commissioner workflow now, then sign in when you are ready to load leagues and personalize the hub.'

  const totalManaged = commissionerLeagues.length
  const needsSetupCount = commissionerLeagues.filter(
    (l) =>
      (l.lifecycleState ?? l.status ?? '').toLowerCase() === 'setup' ||
      (l.lifecycleState ?? l.status ?? '') === '',
  ).length
  const missingDraftDateCount = commissionerLeagues.filter(
    (l) =>
      (l.lifecycleState ?? l.status ?? '').toLowerCase() === 'pre_draft' &&
      !l.draftDate,
  ).length
  const activeCount = commissionerLeagues.filter((l) =>
    ['in_season', 'playoffs', 'drafting'].includes(
      (l.lifecycleState ?? l.status ?? '').toLowerCase(),
    ),
  ).length

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg, #060814)' }}>
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-3xl border border-amber-500/[0.15] bg-gradient-to-br from-amber-500/[0.07] via-[#050814] to-cyan-500/[0.04] p-6 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-60"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,158,11,0.18) 0%, transparent 70%)',
            }}
          />
          <div className="relative z-10">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                <Crown className="h-3 w-3" aria-hidden />
                {COPY.hero.badge}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400/80">
                <Shield className="h-3 w-3" aria-hidden />
                {COPY.hero.trustBadge}
              </span>
            </div>

            <h1 className="text-[28px] font-black leading-tight tracking-tight text-white sm:text-[36px]">
              {COPY.hero.headline1}{' '}
              <span className="bg-gradient-to-r from-amber-300 to-cyan-300 bg-clip-text text-transparent">
                {COPY.hero.headline2}
              </span>
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/60">
              {COPY.hero.sub}
            </p>
            <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-white/38">
              {COPY.hero.sub2}
            </p>
            {showDemoMode && (
              <div className="mt-5 max-w-2xl rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.08] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-200/75">
                  Presentation-safe preview
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-cyan-50/80">
                  The hub now falls back to stable commissioner preview data when leagues, draft state, waiver state,
                  roster data, or NFL foundation reads are still empty.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                href={primaryHeroHref}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-[14px] font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.25)] transition hover:from-amber-300 hover:to-amber-400 active:opacity-90"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {primaryHeroLabel}
              </Link>
              <Link
                href={secondaryHeroHref}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-5 py-2.5 text-[14px] font-semibold text-white/90 transition hover:border-white/35 hover:bg-white/[0.06]"
              >
                <ArrowDownToLine className="h-4 w-4" aria-hidden />
                {secondaryHeroLabel}
              </Link>
            </div>
          </div>
        </section>

        {/* ── League Operations Summary ── */}
        {totalManaged > 0 && (
          <section>
            <SectionHeader label={COPY.ops.sectionLabel} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                value={totalManaged}
                label={COPY.ops.totalManaged}
                accentClass="text-amber-300"
                borderClass="border-amber-500/[0.14] bg-amber-500/[0.04]"
              />
              <StatCard
                value={needsSetupCount}
                label={COPY.ops.needsSetup}
                accentClass={needsSetupCount > 0 ? 'text-amber-400' : 'text-white/40'}
                borderClass={
                  needsSetupCount > 0
                    ? 'border-amber-500/20 bg-amber-500/[0.05]'
                    : 'border-white/[0.07] bg-white/[0.02]'
                }
                alert={needsSetupCount > 0}
              />
              <StatCard
                value={missingDraftDateCount}
                label={COPY.ops.missingDraft}
                accentClass={missingDraftDateCount > 0 ? 'text-amber-400' : 'text-white/40'}
                borderClass={
                  missingDraftDateCount > 0
                    ? 'border-amber-500/20 bg-amber-500/[0.05]'
                    : 'border-white/[0.07] bg-white/[0.02]'
                }
                alert={missingDraftDateCount > 0}
              />
              <StatCard
                value={activeCount}
                label={COPY.ops.active}
                accentClass={activeCount > 0 ? 'text-emerald-400' : 'text-white/40'}
                borderClass={
                  activeCount > 0
                    ? 'border-emerald-500/[0.14] bg-emerald-500/[0.03]'
                    : 'border-white/[0.07] bg-white/[0.02]'
                }
              />
            </div>
          </section>
        )}

        <CommissionerShowcasePanel
          leagues={leagues}
          healthSnapshots={managedHealthSnapshots}
          demoMode={showDemoMode}
        />

        <LeagueHealthDashboard snapshots={managedHealthSnapshots} demoMode={showDemoMode} />

        {/* ── League Setup Health ── */}
        {commissionerLeagues.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-400" aria-hidden />
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400/80">
                Leagues I Manage
                <span className="ml-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300/80">
                  {commissionerLeagues.length}
                </span>
              </p>
              <Link
                href="/create-league"
                className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-amber-400/60 transition hover:text-amber-300"
              >
                <Plus className="h-3 w-3" aria-hidden />
                New league
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {commissionerLeagues.map((league) => {
                const status = resolveSetupStatus(league)
                const nextAction = resolveNextAction(league)
                return (
                  <div
                    key={league.id}
                    className="flex flex-col gap-3 rounded-2xl border border-amber-500/[0.12] bg-amber-500/[0.04] p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold text-white/90">
                          {league.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/40">
                          {league.sport}
                          {league.teamCount ? ` · ${league.teamCount}-team` : ''}
                          {league.scoring ? ` · ${league.scoring}` : ''}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.badgeClass}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} aria-hidden />
                        {status.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/35">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" aria-hidden />
                        {league.teamCount ?? '—'} {COPY.health.membersLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" aria-hidden />
                        {league.draftDate
                          ? new Date(league.draftDate).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })
                          : COPY.health.noDraftDate}
                      </span>
                      {league.season && (
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" aria-hidden />
                          {league.season}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={nextAction.href}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition ${ACTION_VARIANT_CLASSES[nextAction.variant]}`}
                      >
                        {nextAction.label}
                        <ArrowRight className="h-3 w-3" aria-hidden />
                      </Link>
                      <Link
                        href={`/league/${league.id}`}
                        className="ml-auto text-[11px] text-white/30 transition hover:text-white/55"
                      >
                        {COPY.health.viewLeague}
                        <ChevronRight className="inline h-3 w-3" aria-hidden />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Empty state ── */}
        {leagues.length === 0 && (
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
            <Crown className="mx-auto mb-3 h-8 w-8 text-amber-400/40" aria-hidden />
            <p className="text-[14px] font-semibold text-white/60">{emptyHeading}</p>
            <p className="mt-1 text-[12px] text-white/35">{emptySub}</p>
            <div className="mt-4 flex justify-center gap-3">
              <Link
                href={emptyPrimaryHref}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[13px] font-semibold text-amber-300 transition hover:bg-amber-500/20"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {emptyPrimaryLabel}
              </Link>
              <Link
                href={emptySecondaryHref}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-[13px] font-semibold text-white/70 transition hover:border-white/25 hover:bg-white/[0.04]"
              >
                <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />
                {emptySecondaryLabel}
              </Link>
            </div>
          </section>
        )}

        {/* ── Commissioner Mission Queue ── */}
        <section>
          <SectionHeader label={COPY.queue.sectionLabel} hint={COPY.queue.sectionHint} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {missionQueue.map((card) => {
              const Icon = card.icon
              return (
                <Link
                  key={card.key}
                  href={isAuthenticated ? card.href : buildLoginHref(card.href)}
                  className={`group relative flex flex-col gap-3 rounded-2xl border px-4 py-4 transition-all ${card.cardClass}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${card.iconClass}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    {card.badge && (
                      <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/50">
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-white/90 group-hover:text-white">
                      {card.title}
                    </p>
                    <p className="mt-1 text-[12px] leading-snug text-white/45">{card.desc}</p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-white/20 transition group-hover:text-white/50"
                    aria-hidden
                  />
                </Link>
              )
            })}
          </div>
        </section>

        {/* ── Commissioner AI Prompt Cards ── */}
        <section>
          <SectionHeader label={COPY.ai.sectionLabel} hint={COPY.ai.sectionHint} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AI_PROMPT_CARDS.map((card) => {
              const Icon = card.icon
              return (
                <Link
                  key={card.key}
                  href={isAuthenticated ? card.href : buildLoginHref(card.href)}
                  className="group flex flex-col gap-2.5 rounded-2xl border border-violet-500/[0.14] bg-gradient-to-br from-violet-500/[0.06] to-transparent px-4 py-4 transition-all hover:border-violet-500/25 hover:from-violet-500/[0.09]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-300">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    {card.badge && (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/35">
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-white/85 group-hover:text-white">
                      {card.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-white/40">{card.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-violet-400/60 group-hover:text-violet-300">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    Ask Chimmy
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* ── Migration Center ── */}
        <section>
          <SectionHeader label={COPY.migration.sectionLabel} hint={COPY.migration.sectionHint} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MIGRATION_PLATFORMS.map((platform) => {
              const styles = MIGRATION_STATUS_CLASSES[platform.status]
              const statusLabel =
                platform.status === 'active'
                  ? COPY.migration.activeLabel
                  : platform.status === 'legacy'
                    ? COPY.migration.legacyLabel
                    : COPY.migration.comingSoonLabel

              const inner = (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-bold text-white/85">{platform.name}</p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${styles.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} aria-hidden />
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/38">{platform.desc}</p>
                  {platform.status !== 'coming_soon' && (
                    <p className="text-[11px] font-semibold text-emerald-400/70 transition group-hover:text-emerald-300">
                      {COPY.migration.importCta}
                    </p>
                  )}
                </>
              )

              return platform.href ? (
                <Link
                  key={platform.key}
                  href={isAuthenticated ? platform.href : buildLoginHref(platform.href)}
                  className="group flex flex-col gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-4 transition hover:border-emerald-500/20 hover:bg-emerald-500/[0.03]"
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={platform.key}
                  className="flex flex-col gap-2 rounded-2xl border border-white/[0.05] bg-white/[0.01] px-4 py-4 opacity-60"
                >
                  {inner}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Leagues I Play In ── */}
        {memberLeagues.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-cyan-400" aria-hidden />
              <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-400/70">
                {COPY.memberLeagues.sectionLabel}
                <span className="ml-2 rounded-full border border-white/15 bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-bold text-white/45">
                  {memberLeagues.length}
                </span>
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {memberLeagues.map((league) => (
                <Link
                  key={league.id}
                  href={`/league/${league.id}`}
                  className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition hover:border-cyan-500/20 hover:bg-white/[0.04]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                    <Trophy className="h-4 w-4 text-cyan-400/50" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-white/80 group-hover:text-white/95">
                      {league.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/35">
                      {league.sport}
                      {league.teamCount ? ` · ${league.teamCount}-team` : ''}
                    </p>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-white/20 group-hover:text-white/45"
                    aria-hidden
                  />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Trust Block ── */}
        <section className="rounded-2xl border border-emerald-500/[0.12] bg-emerald-500/[0.03] p-5">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400/70" aria-hidden />
            <div>
              <p className="text-[13px] font-bold text-emerald-300/80">{COPY.trust.heading}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/40">{COPY.trust.body1}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-white/30">{COPY.trust.body2}</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

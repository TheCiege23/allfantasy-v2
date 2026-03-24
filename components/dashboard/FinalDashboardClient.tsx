'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  ChevronRight,
  Zap,
  Coins,
  Crown,
  LayoutList,
  Swords,
  ClipboardList,
  Sparkles,
  Loader2,
  Trophy,
  MessageSquare,
  Radio,
  Gift,
  Share2,
  BarChart3,
} from 'lucide-react'
import { groupLeaguesBySport } from '@/lib/dashboard'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { useEntitlement } from '@/hooks/useEntitlement'
import { useLeagueList } from '@/hooks/useLeagueList'
import { ErrorBoundary } from '@/components/error-handling'
import { RetentionStreakWidget, ReturnPromptCards, WeeklySummaryCard } from '@/components/onboarding-retention'
import { DailyCheckInCard } from '@/components/daily-checkin/DailyCheckInCard'
import { buildAIChatHref } from '@/lib/chimmy-chat'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

const QUICK_ACTIONS_BASE = [
  { id: 'start-sit', label: 'Start / Sit', basePath: '/app/coach', icon: LayoutList, iconBg: 'bg-cyan-500/15', iconColor: 'text-cyan-400' },
  { id: 'trade', label: 'Trade', basePath: '/trade-evaluator', icon: Swords, iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
  { id: 'draft', label: 'Draft', basePath: '/mock-draft', icon: ClipboardList, iconBg: 'bg-violet-500/15', iconColor: 'text-violet-400' },
  { id: 'waivers', label: 'Waivers', basePath: '/waiver-ai', icon: Zap, iconBg: 'bg-amber-500/15', iconColor: 'text-amber-400' },
] as const

const MAX_LEAGUES_PER_GROUP = 3

export default function FinalDashboardClient() {
  const { status } = useSession()
  const { balance, loading: tokensLoading, error: tokensError, refetch: refetchTokens } = useTokenBalance()
  const { isActiveOrGrace, loading: entitlementLoading } = useEntitlement()
  const { leagues, loading: leaguesLoading, error: leaguesError, refetch: refetchLeagues } = useLeagueList(status === 'authenticated')

  const groups = useMemo(() => groupLeaguesBySport(leagues), [leagues])
  const leaguesFlat = useMemo(() => groups.flatMap((g) => g.leagues), [groups])
  const hasMoreLeagues = groups.some((group) => group.leagues.length > MAX_LEAGUES_PER_GROUP)
  const firstLeague = leaguesFlat[0]
  const isAuthed = status === 'authenticated'
  const buildLeagueContextHref = useMemo(
    () =>
      (basePath: string): string => {
        if (!firstLeague?.id) return basePath
        const params = new URLSearchParams()
        params.set('leagueId', firstLeague.id)
        if (firstLeague.sport) params.set('sport', String(firstLeague.sport).toUpperCase())
        const variant = firstLeague.leagueVariant ?? firstLeague.league_variant
        if (variant) params.set('leagueVariant', String(variant))
        const query = params.toString()
        return query ? `${basePath}${basePath.includes('?') ? '&' : '?'}${query}` : basePath
      },
    [firstLeague]
  )
  const quickActions = useMemo(
    () =>
      QUICK_ACTIONS_BASE.map((action) => ({
        ...action,
        href:
          action.id === 'draft' && firstLeague?.id
            ? `/app/league/${firstLeague.id}/draft`
            : buildLeagueContextHref(action.basePath),
      })),
    [buildLeagueContextHref, firstLeague?.id]
  )
  const aiSuggestionsHref = firstLeague?.id ? `/app/league/${firstLeague.id}?tab=Advisor` : buildLeagueContextHref('/app/coach')
  const warehouseHistoryHref = firstLeague?.id
    ? `/leagues/${firstLeague.id}?tab=${encodeURIComponent('Previous Leagues')}`
    : '/leagues'
  const dynastyOutlookHref = firstLeague?.id
    ? `/leagues/${firstLeague.id}?tab=${encodeURIComponent('Standings/Playoffs')}`
    : '/rankings'
  const chimmyHref = buildAIChatHref({
    leagueId: firstLeague?.id,
    sport: normalizeToSupportedSport(firstLeague?.sport ? String(firstLeague.sport) : undefined),
    source: 'dashboard',
  })

  if (status === 'loading') {
    return (
      <main className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-white/40" aria-hidden />
          <span className="text-sm text-white/50">Loading…</span>
        </div>
      </main>
    )
  }

  if (!isAuthed) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-10 sm:py-14">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Your dashboard</h1>
          <p className="mt-2 text-sm text-white/50">Sign in to see leagues, drafts, and AI suggestions.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login?callbackUrl=/app/home"
              className="min-h-[44px] inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-premium focus-ring touch-manipulation"
            >
              Sign in
            </Link>
            <Link
              href="/signup?callbackUrl=/app/home"
              className="min-h-[44px] inline-flex items-center justify-center rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-cyan-400 active:scale-[0.98] transition-premium focus-ring touch-manipulation"
            >
              Sign up
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <ErrorBoundary>
    <main className="mx-auto w-full max-w-lg px-4 pb-10 pt-4 sm:pt-6">
      {/* Status strip: tokens + subscription — minimal, one row */}
      <section
        className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.03] px-4 py-3 mb-6"
        aria-label="Account status"
      >
        <Link
          href="/wallet"
          className="flex items-center gap-2 min-h-[40px] min-w-[80px] -m-2 p-2 rounded-lg hover:bg-white/5 transition-premium focus-ring"
        >
          {tokensLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white/40" />
          ) : (
            <Coins className="h-4 w-4 text-amber-400 shrink-0" />
          )}
          {tokensError ? (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); refetchTokens() }}
              className="text-sm font-medium text-amber-400 hover:text-amber-300 touch-manipulation"
            >
              Retry
            </button>
          ) : (
            <span className="text-sm font-medium text-white tabular-nums">{balance}</span>
          )}
          <span className="text-xs text-white/45">tokens</span>
        </Link>
        <Link
          href="/pricing"
          className="flex items-center gap-2 min-h-[40px] min-w-[60px] -m-2 p-2 rounded-lg hover:bg-white/5 transition-premium focus-ring"
        >
          {entitlementLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white/40" />
          ) : isActiveOrGrace ? (
            <>
              <Crown className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-sm font-medium text-white">Pro</span>
            </>
          ) : (
            <span className="text-sm text-white/50">Free</span>
          )}
        </Link>
      </section>

      {/* Engagement streak — non-gambling, consecutive active days */}
      <div className="mb-4">
        <RetentionStreakWidget />
      </div>

      {/* Quick actions — 2x2 mobile, 4 in a row desktop */}
      <section className="mb-8" aria-label="Quick actions">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.id}
                href={action.href}
                className="flex flex-col items-center justify-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 min-h-[88px] sm:min-h-[92px] hover:bg-white/[0.08] hover:border-white/10 active:scale-[0.98] transition-premium focus-ring touch-manipulation"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.iconBg}`}>
                  <Icon className={`h-5 w-5 ${action.iconColor}`} />
                </span>
                <span className="text-xs font-semibold text-white text-center leading-tight">{action.label}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Daily AI check-in — Ask Chimmy today's insight */}
      <section className="mb-4" aria-label="Daily check-in">
        <DailyCheckInCard />
      </section>

      {/* Reminders & AI check-in — retention nudges */}
      <section className="mb-6" aria-label="For you">
        <ReturnPromptCards className="mb-4" />
      </section>

      {/* Active leagues by sport */}
      <section className="mb-8" aria-label="Your leagues">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Trophy className="h-4 w-4 text-white/60" />
            Leagues
          </h2>
          <div className="flex items-center gap-3">
            <Link href="/app/discover" className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-premium focus-ring rounded px-1.5 py-0.5 -m-0.5">
              Discover
            </Link>
            <Link href="/create-league" className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-premium focus-ring rounded px-1.5 py-0.5 -m-0.5">
              Create
            </Link>
            <Link href="/leagues" className="text-xs font-medium text-white/60 hover:text-white transition-premium focus-ring rounded px-1.5 py-0.5 -m-0.5">
              All
            </Link>
          </div>
        </div>
        {leaguesError ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center" role="alert">
            <p className="text-sm text-white/90">{leaguesError}</p>
            <button
              type="button"
              onClick={() => void refetchLeagues()}
              className="mt-3 min-h-[44px] inline-flex items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/20 px-4 py-2.5 text-sm font-medium text-amber-200 hover:bg-amber-500/30 active:scale-[0.98] transition-premium focus-ring touch-manipulation"
            >
              Try again
            </button>
          </div>
        ) : leaguesLoading ? (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 flex justify-center min-h-[120px]">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : leaguesFlat.length === 0 ? (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 text-center">
            <p className="text-sm text-white/50">No leagues yet</p>
            <Link
              href="/create-league"
              className="mt-3 inline-block min-h-[40px] px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 active:scale-[0.98] transition-premium focus-ring touch-manipulation"
            >
              Create or join a league
            </Link>
          </div>
        ) : (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.sport} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] bg-white/[0.03]">
                    <span>{group.emoji}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">{group.label}</span>
                    <span className="ml-auto text-xs text-white/45">{group.leagues.length}</span>
                  </div>
                  <ul className="divide-y divide-white/[0.06]">
                    {group.leagues.slice(0, MAX_LEAGUES_PER_GROUP).map((league) => (
                      <li key={league.id}>
                        <Link
                          href={`/app/league/${league.id}`}
                          className="flex items-center gap-3 px-3 py-3 min-h-[50px] hover:bg-white/[0.04] active:bg-white/[0.06] transition-premium focus-ring"
                        >
                          <span className="text-sm font-medium text-white truncate flex-1 min-w-0">{league.name || 'Unnamed league'}</span>
                          <span className="text-xs text-white/45 shrink-0">{league.leagueSize ?? '?'}-team</span>
                          <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <Link
              href="/leagues"
              className="mt-3 block px-3 py-2 text-center text-xs font-medium text-white/50 hover:text-white/70 hover:bg-white/[0.03] rounded-lg transition-premium focus-ring"
            >
              View all {leaguesFlat.length} leagues
            </Link>
            {hasMoreLeagues ? (
              <p className="mt-2 text-center text-[11px] text-white/35">Showing up to {MAX_LEAGUES_PER_GROUP} leagues per sport on home.</p>
            ) : null}
          </div>
        )}
      </section>

      {/* Upcoming drafts + Live matchups — compact row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8" aria-label="Drafts and matchups">
        <Link
          href={firstLeague ? `/app/league/${firstLeague.id}/draft` : '/mock-draft'}
          className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 min-h-[64px] hover:bg-white/[0.06] active:scale-[0.99] transition"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Upcoming drafts</p>
            <p className="text-xs text-white/50 truncate">
              {firstLeague ? `${firstLeague.name || 'League'} draft` : 'Mock draft'}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
        </Link>
        <Link
          href={firstLeague ? `/app/league/${firstLeague.id}?tab=Matchups` : '/app/matchup-simulation'}
          className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 min-h-[64px] hover:bg-white/[0.06] active:scale-[0.99] transition"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Radio className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Live matchups</p>
            <p className="text-xs text-white/50">Scores & projections</p>
          </div>
          <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
        </Link>
      </section>

      {/* AI suggestions — single prominent card */}
      <section className="mb-8" aria-label="AI suggestions">
        <Link
          href={aiSuggestionsHref}
          className="flex items-center gap-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-4 min-h-[64px] hover:bg-cyan-500/15 active:scale-[0.99] transition"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">AI suggestions</p>
            <p className="text-xs text-cyan-300/80">Start/sit, waivers, trade tips</p>
          </div>
          <ChevronRight className="h-4 w-4 text-cyan-400/70 shrink-0" />
        </Link>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Meta analytics">
        <Link
          href="/app/meta-insights"
          className="flex items-center gap-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4 min-h-[64px] hover:bg-indigo-500/15 active:scale-[0.99] transition"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Meta insights</p>
            <p className="text-xs text-indigo-200/80">Draft, waiver, trade, roster, strategy trends</p>
          </div>
          <ChevronRight className="h-4 w-4 text-indigo-300/70 shrink-0" />
        </Link>
        <Link
          href="/app/trend-feed"
          className="flex items-center gap-3 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 p-4 min-h-[64px] hover:bg-fuchsia-500/15 active:scale-[0.99] transition"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/20 text-fuchsia-300">
            <Zap className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Trend feed</p>
            <p className="text-xs text-fuchsia-200/80">Player momentum and AI trend explanations</p>
          </div>
          <ChevronRight className="h-4 w-4 text-fuchsia-300/70 shrink-0" />
        </Link>
        <Link
          href={warehouseHistoryHref}
          className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 min-h-[64px] hover:bg-emerald-500/15 active:scale-[0.99] transition"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">League history warehouse</p>
            <p className="text-xs text-emerald-200/80">Historical facts, drill-downs, exports, AI context</p>
          </div>
          <ChevronRight className="h-4 w-4 text-emerald-300/70 shrink-0" />
        </Link>
        <Link
          href={dynastyOutlookHref}
          className="flex items-center gap-3 rounded-xl bg-violet-500/10 border border-violet-500/20 p-4 min-h-[64px] hover:bg-violet-500/15 active:scale-[0.99] transition"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
            <Crown className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Dynasty outlook cards</p>
            <p className="text-xs text-violet-200/80">3y/5y projection cards, rebuild odds, future asset drill-down</p>
          </div>
          <ChevronRight className="h-4 w-4 text-violet-300/70 shrink-0" />
        </Link>
      </section>

      {/* Weekly summary — recap and send to notifications */}
      <section className="mb-6">
        <WeeklySummaryCard />
      </section>

      {/* Chimmy — compact secondary */}
      <section>
        <Link
          href={chimmyHref}
          className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 min-h-[56px] hover:bg-white/[0.05] active:scale-[0.99] transition"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/80">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">Chimmy AI</p>
            <p className="text-xs text-white/45">Ask about your leagues</p>
          </div>
          <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
        </Link>
      </section>

      {/* Invite & share — social growth */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Invite and share">
        <Link
          href="/referrals"
          className="flex items-center gap-3 rounded-xl bg-violet-500/10 border border-violet-500/20 p-4 min-h-[56px] hover:bg-violet-500/15 active:scale-[0.99] transition"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
            <Gift className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">Invite & earn</p>
            <p className="text-xs text-white/50">Referral link, invite friends, track rewards</p>
          </div>
          <ChevronRight className="h-4 w-4 text-violet-400/70 shrink-0" />
        </Link>
        <Link
          href="/app/share-achievements"
          className="flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 min-h-[56px] hover:bg-amber-500/15 active:scale-[0.99] transition"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
            <Share2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">Create AI post</p>
            <p className="text-xs text-white/50">Share wins, matchups, draft results</p>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-400/70 shrink-0" />
        </Link>
      </section>

      {/* Footer links — minimal */}
      <footer className="mt-8 pt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-4 text-xs text-white/40">
        <Link href="/referrals" className="hover:text-white/60">
          Referrals
        </Link>
        <Link href="/app/share-achievements" className="hover:text-white/60">
          Share
        </Link>
        <Link href="/app/power-rankings" className="hover:text-white/60">
          Power rankings
        </Link>
        <Link href="/app/simulation-lab" className="hover:text-white/60">
          Simulation lab
        </Link>
        <Link href="/app/discover" className="hover:text-white/60">
          Discover leagues
        </Link>
      </footer>
    </main>
    </ErrorBoundary>
  )
}

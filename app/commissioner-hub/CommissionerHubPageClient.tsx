'use client'

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
} from 'lucide-react'
import type { UserLeague } from '@/app/dashboard/types'

type MissionCard = {
  key: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  href: string
  cardClass: string
  iconClass: string
  badge?: string
}

const MISSION_CARDS: MissionCard[] = [
  {
    key: 'create',
    icon: Plus,
    title: 'Create League',
    desc: 'Launch a new NFL, NBA, MLB, or multi-sport league in minutes.',
    href: '/create-league',
    cardClass: 'border-cyan-500/30 bg-gradient-to-br from-cyan-500/[0.10] to-transparent hover:border-cyan-500/45',
    iconClass: 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300',
    badge: 'Start Here',
  },
  {
    key: 'import',
    icon: ArrowDownToLine,
    title: 'Import League',
    desc: 'Bring your Sleeper, ESPN, Yahoo, or MFL league to AllFantasy in under 2 minutes.',
    href: '/import',
    cardClass: 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.07] to-transparent hover:border-emerald-500/40',
    iconClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
  {
    key: 'invites',
    icon: Mail,
    title: 'Send Invites',
    desc: 'Recruit managers and fill your league roster with one shareable link.',
    href: '/import',
    cardClass: 'border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] to-transparent hover:border-violet-500/35',
    iconClass: 'border-violet-500/35 bg-violet-500/10 text-violet-300',
  },
  {
    key: 'draft',
    icon: Target,
    title: 'Draft Readiness',
    desc: 'Check lineup health, set draft order, and confirm settings before draft day.',
    href: '/war-room',
    cardClass: 'border-amber-500/25 bg-gradient-to-br from-amber-500/[0.07] to-transparent hover:border-amber-500/40',
    iconClass: 'border-amber-500/35 bg-amber-500/10 text-amber-300',
  },
  {
    key: 'ai',
    icon: Sparkles,
    title: 'Ask Commissioner AI',
    desc: 'Get AI-powered advice on rules, disputes, waiver settings, and league health.',
    href: '/ai/tools',
    cardClass: 'border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] to-transparent hover:border-violet-500/40',
    iconClass: 'border-violet-500/40 bg-violet-500/15 text-violet-300',
    badge: 'AI',
  },
  {
    key: 'recap',
    icon: FileText,
    title: 'Generate Weekly Recap',
    desc: 'Auto-generate a shareable league recap to keep your managers engaged all season.',
    href: '/ai/tools',
    cardClass: 'border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.06] to-transparent hover:border-cyan-500/35',
    iconClass: 'border-cyan-500/30 bg-cyan-500/[0.08] text-cyan-400',
    badge: 'Beta',
  },
]

type CommissionerHubPageClientProps = {
  leagues: UserLeague[]
}

export default function CommissionerHubPageClient({ leagues }: CommissionerHubPageClientProps) {
  const commissionerLeagues = leagues.filter((l) => l.isCommissioner)
  const memberLeagues = leagues.filter((l) => !l.isCommissioner)

  return (
    <div className="min-h-screen bg-[#060814]">
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">

        {/* Hero */}
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
                Commissioner Hub
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400/80">
                <Shield className="h-3 w-3" aria-hidden />
                No gambling. Pure fantasy.
              </span>
            </div>

            <h1 className="text-[28px] font-black leading-tight tracking-tight text-white sm:text-[36px]">
              Run better leagues.{' '}
              <span className="bg-gradient-to-r from-amber-300 to-cyan-300 bg-clip-text text-transparent">
                Build your legacy.
              </span>
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/60">
              Built for commissioners. Loved by managers. Every tool you need to create, grow, and
              manage your fantasy empire — all in one place.
            </p>
            <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-white/38">
              Draft smarter. Keep members engaged. Move entire leagues onto AllFantasy.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                href="/create-league"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-[14px] font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.25)] transition hover:from-amber-300 hover:to-amber-400 active:opacity-90"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Create a League
              </Link>
              <Link
                href="/import"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-5 py-2.5 text-[14px] font-semibold text-white/90 transition hover:border-white/35 hover:bg-white/[0.06]"
              >
                <ArrowDownToLine className="h-4 w-4" aria-hidden />
                Import League
              </Link>
            </div>
          </div>
        </section>

        {/* Mission Cards */}
        <section>
          <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-white/40">
            Commissioner Actions
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MISSION_CARDS.map((card) => {
              const Icon = card.icon
              return (
                <Link
                  key={card.key}
                  href={card.href}
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

        {/* Leagues I Manage */}
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
              {commissionerLeagues.map((league) => (
                <Link
                  key={league.id}
                  href={`/league/${league.id}`}
                  className="group flex items-center gap-3 rounded-2xl border border-amber-500/[0.12] bg-amber-500/[0.04] p-4 transition hover:border-amber-500/25 hover:bg-amber-500/[0.07]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10">
                    <Crown className="h-4 w-4 text-amber-400/80" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-white/90 group-hover:text-white">
                      {league.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/40">
                      {league.sport} · {league.teamCount}-team ·{' '}
                      {league.scoring ?? 'Standard'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/25 group-hover:text-white/60" aria-hidden />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Leagues I Play In */}
        {memberLeagues.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-cyan-400" aria-hidden />
              <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-400/70">
                Leagues I Play In
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
                      {league.sport} · {league.teamCount}-team
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/20 group-hover:text-white/45" aria-hidden />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {leagues.length === 0 && (
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
            <Crown className="mx-auto mb-3 h-8 w-8 text-amber-400/40" aria-hidden />
            <p className="text-[14px] font-semibold text-white/60">No leagues yet.</p>
            <p className="mt-1 text-[12px] text-white/35">
              Create or import a league to get started as a commissioner.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link
                href="/create-league"
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[13px] font-semibold text-amber-300 transition hover:bg-amber-500/20"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Create League
              </Link>
              <Link
                href="/import"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-[13px] font-semibold text-white/70 transition hover:border-white/25 hover:bg-white/[0.04]"
              >
                <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />
                Import
              </Link>
            </div>
          </section>
        )}

        {/* Trust block */}
        <section className="rounded-2xl border border-emerald-500/[0.12] bg-emerald-500/[0.03] p-5">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400/70" aria-hidden />
            <div>
              <p className="text-[13px] font-bold text-emerald-300/80">
                No gambling. No sportsbook. Just fantasy.
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/40">
                AllFantasy is a pure fantasy management platform. No gambling, no shady pick
                predictions — just AI-powered tools and intelligence to help you run the best
                leagues possible.
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

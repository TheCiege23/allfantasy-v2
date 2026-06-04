'use client'

import Link from 'next/link'
import { ArrowRight, Bot, Crown, Share2, Sparkles, Trophy, Users } from 'lucide-react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

const FEATURE_KEYS = [
  'dashboard.worldCupPromo.feature.aiInsights',
  'dashboard.worldCupPromo.feature.commissionerTools',
  'dashboard.worldCupPromo.feature.inviteLinks',
  'dashboard.worldCupPromo.feature.groupPredictions',
  'dashboard.worldCupPromo.feature.knockoutBrackets',
  'dashboard.worldCupPromo.feature.liveExperience',
]

export function WorldCupDashboardPromo() {
  const { t } = useLanguage()

  return (
    <section
      className="relative isolate overflow-hidden rounded-[1.35rem] border border-cyan-200/25 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.22),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(251,191,36,0.18),transparent_30%),linear-gradient(135deg,rgba(2,7,20,0.98),rgba(6,12,30,0.97)_54%,rgba(11,18,44,0.95))] p-4 shadow-[0_28px_90px_-54px_rgba(34,211,238,0.95)] sm:p-5"
      data-testid="dashboard-world-cup-promo"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/80 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 right-[-5rem] h-52 w-52 rounded-full border border-amber-200/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 right-[-6rem] h-64 w-64 rounded-full border border-cyan-200/10"
      />

      <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-cyan-200/25 bg-cyan-300/[0.10] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
              <Trophy className="h-3.5 w-3.5" aria-hidden />
              {t('dashboard.worldCupPromo.eyebrow')}
            </span>
            <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-amber-200/25 bg-amber-300/[0.10] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t('dashboard.worldCupPromo.status')}
            </span>
          </div>

          <h2 className="max-w-2xl text-balance text-[27px] font-black leading-[1.02] tracking-tight text-white sm:text-[36px]">
            {t('dashboard.worldCupPromo.headline')}
          </h2>
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-white/72 sm:text-[15px]">
            {t('dashboard.worldCupPromo.subheadline')}
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {FEATURE_KEYS.map((key) => (
              <div
                key={key}
                className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/[0.075] bg-white/[0.045] px-3 py-2 text-[12px] font-bold text-white/78"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.95)]" />
                <span>{t(key)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-4 rounded-[1.1rem] border border-white/10 bg-black/28 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.09] p-3">
              <Users className="h-4 w-4 text-cyan-100" aria-hidden />
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100/65">
                {t('dashboard.worldCupPromo.tile.pools')}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200/18 bg-amber-300/[0.09] p-3">
              <Crown className="h-4 w-4 text-amber-100" aria-hidden />
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100/70">
                {t('dashboard.worldCupPromo.tile.commish')}
              </p>
            </div>
            <div className="rounded-2xl border border-violet-200/18 bg-violet-300/[0.09] p-3">
              <Bot className="h-4 w-4 text-violet-100" aria-hidden />
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-violet-100/70">
                {t('dashboard.worldCupPromo.tile.chimmy')}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200/20 bg-amber-300/[0.08] p-3">
            <div className="flex gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-100" aria-hidden />
              <p className="text-[12px] font-bold leading-5 text-amber-50/88">
                {t('dashboard.worldCupPromo.premiumCallout')}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/pricing"
                className="inline-flex min-h-9 items-center justify-center rounded-full border border-amber-100/25 bg-amber-100/[0.12] px-3 text-[11px] font-black uppercase tracking-[0.08em] text-amber-50 transition hover:bg-amber-100/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70"
              >
                {t('dashboard.worldCupPromo.proLink')}
              </Link>
              <Link
                href="/tokens"
                className="inline-flex min-h-9 items-center justify-center rounded-full border border-cyan-100/25 bg-cyan-100/10 px-3 text-[11px] font-black uppercase tracking-[0.08em] text-cyan-50 transition hover:bg-cyan-100/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
              >
                {t('dashboard.worldCupPromo.tokensLink')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-5 grid gap-2 sm:grid-cols-3">
        <Link
          href="/brackets/world-cup/create"
          className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-2xl border border-cyan-100/35 bg-gradient-to-r from-cyan-300 to-blue-400 px-4 text-[13px] font-black text-slate-950 shadow-[0_14px_34px_-20px_rgba(34,211,238,1)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_-22px_rgba(34,211,238,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          data-testid="dashboard-world-cup-create-pool"
        >
          {t('dashboard.worldCupPromo.createPool')}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href="/brackets/world-cup/join"
          className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-2xl border border-white/16 bg-white/[0.06] px-4 text-[13px] font-black text-white transition hover:border-cyan-100/35 hover:bg-white/[0.09] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
          data-testid="dashboard-world-cup-join-pool"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          {t('dashboard.worldCupPromo.joinPool')}
        </Link>
        <Link
          href="/brackets/world-cup"
          className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-2xl border border-amber-100/30 bg-amber-300/[0.12] px-4 text-[13px] font-black text-amber-50 transition hover:bg-amber-300/[0.18] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80"
          data-testid="dashboard-world-cup-build-bracket"
        >
          {t('dashboard.worldCupPromo.buildBracket')}
          <Trophy className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  )
}

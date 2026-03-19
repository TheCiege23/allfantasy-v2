'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  LogIn,
  UserPlus,
  BarChart3,
  Sparkles,
  Layers3,
  LayoutDashboard,
  Gauge,
  Users,
  LineChart,
  Dribbble,
  IceCream2,
  Goal,
  Flag,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

function AppLandingInner() {
  const { status } = useSession()
  const isAuthed = status === 'authenticated'
  const { t } = useLanguage()

  return (
    <main
      className="min-h-screen mode-readable"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:flex-row lg:items-start lg:gap-10">
        <div className="flex-1 space-y-4 sm:space-y-5">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            AllFantasy Sports App
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            {t('app.page.hero.h1')}
          </h1>
          <p className="max-w-2xl text-sm text-white/80 sm:text-base mode-muted">
            {t('app.page.hero.subtitle')}
          </p>
          <p className="max-w-2xl text-xs text-white/60 sm:text-sm mode-muted-2">
            {t('app.page.hero.supporting')}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={isAuthed ? '/app/home' : '/signup?next=/app/home'}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-black shadow-sm hover:bg-emerald-400 sm:text-sm"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>
                {isAuthed ? t('app.landing.continue') : t('app.page.hero.cta.signup')}
              </span>
            </Link>
            <Link
              href={isAuthed ? '/app/home' : '/login?next=/app/home'}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10 sm:text-sm"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{t('app.page.hero.cta.signin')}</span>
            </Link>
            <Link
              href="/trade-analyzer"
              className="inline-flex items-center gap-1 text-xs text-white/75 underline-offset-2 hover:text-white hover:underline sm:text-sm"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>{t('app.page.hero.cta.trade')}</span>
            </Link>
          </div>
        </div>

        <aside className="flex-1 space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5 sm:p-6 mode-panel-soft">
          <h2 className="text-sm font-semibold text-white/80 sm:text-base">
            {t('app.page.quickLinks.title')}
          </h2>
          <div className="space-y-2 text-xs sm:text-sm">
            <Link
              href="/app/home"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-3 hover:bg-black/60"
            >
              <span className="font-medium">{t('app.page.quickLinks.shell')}</span>
              <span className="text-[10px] text-white/50">/app/home</span>
            </Link>
            <Link
              href="/leagues"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-3 hover:bg-black/60"
            >
              <span className="font-medium">{t('app.page.quickLinks.leagues')}</span>
              <span className="text-[10px] text-white/50">/leagues</span>
            </Link>
            <Link
              href="/trade-evaluator"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-3 hover:bg-black/60"
            >
              <span className="font-medium">{t('app.page.quickLinks.trade')}</span>
              <span className="text-[10px] text-white/50">/trade-evaluator</span>
            </Link>
          </div>
        </aside>
      </section>

      {/* Feature highlights */}
      <section className="border-t border-white/10/5 bg-[rgba(0,0,0,0.3)] px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <h2 className="text-sm font-semibold text-white/80 sm:text-base">
            {t('app.page.features.title')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-2 flex items-center gap-2 text-white">
                <BarChart3 className="h-4 w-4 text-cyan-300" />
                <span className="text-sm font-semibold">
                  {t('app.page.features.trade.title')}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {t('app.page.features.trade.body')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-2 flex items-center gap-2 text-white">
                <LayoutDashboard className="h-4 w-4 text-emerald-300" />
                <span className="text-sm font-semibold">
                  {t('app.page.features.roster.title')}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {t('app.page.features.roster.body')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-2 flex items-center gap-2 text-white">
                <Users className="h-4 w-4 text-purple-300" />
                <span className="text-sm font-semibold">
                  {t('app.page.features.league.title')}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {t('app.page.features.league.body')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-2 flex items-center gap-2 text-white">
                <LineChart className="h-4 w-4 text-amber-300" />
                <span className="text-sm font-semibold">
                  {t('app.page.features.player.title')}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {t('app.page.features.player.body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Product screenshot / demo section */}
      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-white/80 sm:text-base">
              {t('app.page.demo.title')}
            </h2>
            <p className="max-w-2xl text-xs text-white/65 sm:text-sm mode-muted">
              {t('app.page.demo.subtitle')}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-3 flex items-center gap-2 text-white">
                <BarChart3 className="h-4 w-4 text-cyan-300" />
                <span className="text-sm font-semibold">{t('app.page.demo.tradeResult.title')}</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs mode-panel">
                <div className="flex items-center justify-between text-[11px] text-white/80">
                  <span>{t('app.page.demo.tradeResult.fairness')}</span>
                  <span className="font-semibold text-emerald-300">87 / 100</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-4/5 rounded-full bg-emerald-400" />
                </div>
                <p className="mt-3 text-[11px] text-white/70">
                  {t('app.page.demo.tradeResult.body')}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-3 flex items-center gap-2 text-white">
                <LayoutDashboard className="h-4 w-4 text-emerald-300" />
                <span className="text-sm font-semibold">{t('app.page.demo.roster.title')}</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs mode-panel">
                <div className="flex items-center justify-between text-[11px] text-white/80">
                  <span>{t('app.page.demo.roster.weekOverview')}</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                    +9.7 projected
                  </span>
                </div>
                <div className="mt-2 space-y-1.5 text-[11px] text-white/75">
                  <div className="flex items-center justify-between">
                    <span>QB · J. Hurts</span>
                    <span className="text-emerald-300">Start</span>
                  </div>
                  <div className="flex items-center justify-between">
                      <span>{t('app.page.demo.roster.row2')}</span>
                    <span className="text-emerald-300">Upgrade</span>
                  </div>
                  <div className="flex items-center justify-between">
                      <span>{t('app.page.demo.roster.row3')}</span>
                    <span className="text-yellow-300">Monitor</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-3 flex items-center gap-2 text-white">
                <Sparkles className="h-4 w-4 text-purple-300" />
                <span className="text-sm font-semibold">{t('app.page.demo.insights.title')}</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs mode-panel">
                <div className="mb-1 flex items-center justify-between text-[11px] text-white/80">
                  <span>WR · A. St. Brown</span>
                  <span className="text-emerald-300">Top 5 ROS</span>
                </div>
                <p className="text-[11px] text-white/70">
                  {t('app.page.demo.insights.body')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI tools section */}
      <section className="border-t border-white/10/5 bg-[rgba(0,0,0,0.4)] px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <h2 className="text-sm font-semibold text-white/80 sm:text-base">
            {t('app.page.ai.title')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-2 flex items-center gap-2 text-white">
                <BarChart3 className="h-4 w-4 text-cyan-300" />
                <span className="text-sm font-semibold">
                  {t('app.page.ai.trade.title')}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {t('app.page.ai.trade.body')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-2 flex items-center gap-2 text-white">
                <Gauge className="h-4 w-4 text-emerald-300" />
                <span className="text-sm font-semibold">
                  {t('app.page.ai.compare.title')}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {t('app.page.ai.compare.body')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-2 flex items-center gap-2 text-white">
                <Layers3 className="h-4 w-4 text-purple-300" />
                <span className="text-sm font-semibold">
                  {t('app.page.ai.lineup.title')}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {t('app.page.ai.lineup.body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supported sports */}
      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white/80 sm:text-base">
              {t('app.page.sports.title')}
            </h2>
            <p className="max-w-2xl text-xs text-white/65 sm:text-sm mode-muted">
              {t('app.page.sports.helper')}
            </p>
          </div>
          <div className="grid gap-2 text-xs sm:grid-cols-4 sm:text-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5">
              <Goal className="h-4 w-4 text-emerald-300" />
              <span>NFL</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5">
              <Dribbble className="h-4 w-4 text-orange-300" />
              <span>NBA</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5">
              <Gauge className="h-4 w-4 text-amber-300" />
              <span>MLB</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5">
              <IceCream2 className="h-4 w-4 text-sky-300" />
              <span>NHL</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5">
              <Goal className="h-4 w-4 text-green-300" />
              <span>Soccer</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5">
              <Flag className="h-4 w-4 text-red-300" />
              <span>NASCAR</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5">
              <Sparkles className="h-4 w-4 text-lime-300" />
              <span>PGA</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5">
              <Sparkles className="h-4 w-4 text-indigo-300" />
              <span>NCAA</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="border-t border-white/10/5 bg-[rgba(16,185,129,0.15)] px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 rounded-3xl border border-emerald-400/60 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-emerald-500/0 p-6 sm:p-8">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white sm:text-xl">
              {t('app.page.cta.title')}
            </h2>
            <p className="max-w-2xl text-xs text-white/80 sm:text-sm">
              {t('app.page.cta.subtitle')}
            </p>
          </div>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href={isAuthed ? '/app/home' : '/signup?next=/app/home'}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black shadow-sm hover:bg-gray-100 sm:text-sm"
            >
              <UserPlus className="h-4 w-4" />
              <span>{t('app.page.cta.primary')}</span>
            </Link>
            <Link
              href="/trade-analyzer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-transparent px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/10 sm:text-sm"
            >
              <BarChart3 className="h-4 w-4" />
              <span>{t('app.page.cta.secondary')}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Simple footer */}
      <footer className="border-t border-white/10/5 py-6 text-center text-xs text-white/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-4">
          <span>© {new Date().getFullYear()} AllFantasy</span>
          <span className="hidden text-white/30 sm:inline">•</span>
          <Link href="/disclaimer" className="text-white/50 hover:text-white/80">
            {t('app.page.footer.disclaimer')}
          </Link>
          <span className="text-white/30">•</span>
          <Link href="/privacy" className="text-white/50 hover:text-white/80">
            {t('landing.footer.privacy')}
          </Link>
          <span className="text-white/30">•</span>
          <Link href="/terms" className="text-white/50 hover:text-white/80">
            {t('landing.footer.terms')}
          </Link>
        </div>
      </footer>
    </main>
  )
}

export default function AppProductRootPage() {
  const { t } = useLanguage()

  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >
          <div style={{ color: 'var(--muted2)' }}>{t('common.loading')}</div>
        </main>
      }
    >
      <AppLandingInner />
    </Suspense>
  )
}

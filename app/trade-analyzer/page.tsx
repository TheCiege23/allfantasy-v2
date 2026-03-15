'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BarChart3,
  LogIn,
  UserPlus,
  Sparkles,
  Gauge,
  Users,
  LineChart,
  Goal,
  Dribbble,
  IceCream2,
  Flag,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

function TradeAnalyzerLandingInner() {
  const { status } = useSession()
  const isAuthed = status === 'authenticated'
  const { t } = useLanguage()

  return (
    <main
      className="min-h-screen mode-readable"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Hero section */}
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:flex-row lg:items-start lg:gap-10">
        <div className="flex-1 space-y-4 sm:space-y-5">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-100">
            <BarChart3 className="h-3.5 w-3.5" />
            AllFantasy Trade Analyzer
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            {t('trade.page.hero.h1')}
          </h1>
          <p className="max-w-2xl text-sm text-white/80 sm:text-base mode-muted">
            {t('trade.page.hero.subtitle')}
          </p>
          <p className="max-w-2xl text-xs text-white/65 sm:text-sm mode-muted-2">
            {t('trade.page.hero.supporting')}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/trade-evaluator"
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-black shadow-sm hover:bg-cyan-300 sm:text-sm"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>{t('trade.page.hero.cta.analyze')}</span>
            </Link>
            {!isAuthed && (
              <Link
                href="/signup?next=/trade-evaluator"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10 sm:text-sm"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{t('trade.page.hero.cta.signup')}</span>
              </Link>
            )}
            <Link
              href="/app"
              className="inline-flex items-center gap-1 text-xs text-white/75 underline-offset-2 hover:text-white hover:underline sm:text-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t('trade.page.hero.cta.app')}</span>
            </Link>
          </div>
        </div>

        {/* Entry card */}
        <aside className="flex-1 space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5 sm:p-6 mode-panel-soft">
          <h2 className="text-sm font-semibold text-white/80 sm:text-base">
            {t('trade.page.entry.title')}
          </h2>
          <p className="text-xs text-white/70 sm:text-sm">
            {t('trade.page.entry.body')}
          </p>
          <div className="mt-2 space-y-2 text-xs sm:text-sm">
            <Link
              href="/trade-evaluator"
              className="flex items-center justify-between rounded-xl border border-cyan-400/60 bg-cyan-500/15 px-4 py-3 text-white hover:bg-cyan-500/25"
            >
              <span className="font-medium">{t('trade.page.hero.cta.analyze')}</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-cyan-100">
                <BarChart3 className="h-3 w-3" />
                /trade-evaluator
              </span>
            </Link>
            {!isAuthed && (
              <div className="flex items-center justify-between gap-2 text-white/80">
                <Link
                  href="/login?next=/trade-evaluator"
                  className="hover:text-white underline-offset-2 hover:underline"
                >
                  {t('trade.landing.signIn')}
                </Link>
                <span className="text-white/40">·</span>
                <Link
                  href="/signup?next=/trade-evaluator"
                  className="hover:text-white underline-offset-2 hover:underline"
                >
                  {t('trade.landing.signUp')}
                </Link>
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* How it works */}
      <section className="border-t border-white/10/5 bg-[rgba(0,0,0,0.3)] px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <h2 className="text-sm font-semibold text-white/80 sm:text-base">
            {t('trade.page.how.title')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-2 flex items-center gap-2 text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                  1
                </span>
                <span className="text-sm font-semibold">
                  {t('trade.page.how.step1.title')}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {t('trade.page.how.step1.body')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-2 flex items-center gap-2 text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                  2
                </span>
                <span className="text-sm font-semibold">
                  {t('trade.page.how.step2.title')}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {t('trade.page.how.step2.body')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-2 flex items-center gap-2 text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                  3
                </span>
                <span className="text-sm font-semibold">
                  {t('trade.page.how.step3.title')}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {t('trade.page.how.step3.body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature / benefits */}
      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <h2 className="text-sm font-semibold text-white/80 sm:text-base">
            {t('trade.page.benefits.title')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-2 flex items-center gap-2 text-white">
                <BarChart3 className="h-4 w-4 text-cyan-300" />
                <span className="text-sm font-semibold">
                  {t('trade.page.benefits.card1.title')}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {t('trade.page.benefits.card1.body')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-2 flex items-center gap-2 text-white">
                <Gauge className="h-4 w-4 text-emerald-300" />
                <span className="text-sm font-semibold">
                  {t('trade.page.benefits.card2.title')}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {t('trade.page.benefits.card2.body')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-2 flex items-center gap-2 text-white">
                <Users className="h-4 w-4 text-purple-300" />
                <span className="text-sm font-semibold">
                  {t('trade.page.benefits.card3.title')}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {t('trade.page.benefits.card3.body')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mode-panel-soft">
              <div className="mb-2 flex items-center gap-2 text-white">
                <LineChart className="h-4 w-4 text-amber-300" />
                <span className="text-sm font-semibold">
                  {t('trade.page.benefits.card4.title')}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {t('trade.page.benefits.card4.body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supported sports */}
      <section className="border-t border-white/10/5 bg-[rgba(0,0,0,0.3)] px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white/80 sm:text-base">
              {t('trade.page.sports.title')}
            </h2>
            <p className="max-w-2xl text-xs text-white/65 sm:text-sm mode-muted">
              {t('trade.page.sports.helper')}
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
              <span>NCAA</span>
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
          </div>
        </div>
      </section>

      {/* Trust / value section */}
      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-white/80 sm:text-base">
            {t('trade.page.trust.title')}
          </h2>
          <ul className="grid gap-2 text-xs text-white/70 sm:grid-cols-3 sm:text-sm">
            <li>• {t('trade.page.trust.item1')}</li>
            <li>• {t('trade.page.trust.item2')}</li>
            <li>• {t('trade.page.trust.item3')}</li>
          </ul>
        </div>
      </section>

      {/* Signup / CTA section */}
      <section className="border-t border-white/10/5 bg-[rgba(8,145,178,0.18)] px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 rounded-3xl border border-cyan-400/60 bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-cyan-500/0 p-6 sm:p-8">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white sm:text-xl">
              {t('trade.page.cta.title')}
            </h2>
            <p className="max-w-2xl text-xs text-white/80 sm:text-sm">
              {t('trade.page.cta.subtitle')}
            </p>
          </div>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/trade-evaluator"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black shadow-sm hover:bg-gray-100 sm:text-sm"
            >
              <BarChart3 className="h-4 w-4" />
              <span>{t('trade.page.cta.primary')}</span>
            </Link>
            <Link
              href="/signup?next=/trade-evaluator"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-transparent px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/10 sm:text-sm"
            >
              <UserPlus className="h-4 w-4" />
              <span>{t('trade.page.cta.secondary')}</span>
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
            Disclaimer
          </Link>
          <span className="text-white/30">•</span>
          <Link
            href="/privacy"
            className="text-white/50 hover:text-white/80"
          >
            Privacy
          </Link>
          <span className="text-white/30">•</span>
          <Link href="/terms" className="text-white/50 hover:text-white/80">
            Terms
          </Link>
        </div>
      </footer>
    </main>
  )
}

export default function TradeAnalyzerLandingPage() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >
          <div style={{ color: 'var(--muted2)' }}>Loading...</div>
        </main>
      }
    >
      <TradeAnalyzerLandingInner />
    </Suspense>
  )
}


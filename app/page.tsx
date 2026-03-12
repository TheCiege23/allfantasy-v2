'use client'

import React, { Suspense, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Trophy, Zap, AppWindow, LogIn, UserPlus, BarChart3 } from 'lucide-react'
import { ModeToggle } from '@/components/theme/ModeToggle'
import LanguageToggle from '@/components/i18n/LanguageToggle'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import ProductDemoSection from '@/components/home/ProductDemoSection'
import TradeAnalyzerPreview from '@/components/home/TradeAnalyzerPreview'

function HomeContent() {
  const { t } = useLanguage()

  const jsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'AllFantasy',
      applicationCategory: 'SportsApplication',
      operatingSystem: 'Web',
      description:
        'AI-powered fantasy sports platform for league tools, trade analysis, and NCAA bracket challenges.',
      url: 'https://allfantasy.ai/',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    }),
    []
  )

  return (
    <main
      className="min-h-screen flex flex-col mode-readable"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Top bar */}
      <header className="w-full border-b border-white/10/5">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <img
              src="/af-crest.png"
              alt="AllFantasy crest"
              className="h-8 w-8 rounded-lg border border-white/10 bg-black/40 object-contain"
            />
            <span className="text-sm font-semibold tracking-tight sm:text-base">
              AllFantasy.ai
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ModeToggle className="hidden sm:inline-flex rounded-full px-3 py-1 text-xs" />
            <LanguageToggle />
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{t('common.signIn')}</span>
            </Link>
            <Link
              href="/signup"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-sm hover:bg-gray-100"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{t('common.signUp')}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 text-center sm:px-6 sm:py-12">
          <div className="space-y-4 sm:space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t('home.tagline')}
            </p>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              {t('home.title')}
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-white/70 sm:text-base">
              {t('home.subtitle')}
            </p>
            <p className="mx-auto max-w-2xl text-xs text-white/50 sm:text-sm">
              {t('home.featureSummary')}
            </p>
          </div>

          {/* CTA cluster */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href="/app"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-black shadow-sm hover:bg-emerald-400 sm:flex-none sm:px-6"
            >
              <AppWindow className="h-4 w-4" />
              <span>{t('home.hero.cta.app')}</span>
            </Link>
            <Link
              href="/bracket"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-black shadow-sm hover:bg-sky-400 sm:flex-none sm:px-6"
            >
              <Trophy className="h-4 w-4" />
              <span>{t('home.hero.cta.bracket')}</span>
            </Link>
            <Link
              href="/legacy"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-black shadow-sm hover:bg-amber-300 sm:flex-none sm:px-6"
            >
              <Zap className="h-4 w-4" />
              <span>{t('home.hero.cta.legacy')}</span>
            </Link>
          </div>

          <div className="mt-3 text-xs text-white/70 sm:text-sm">
            <Link
              href="/trade-analyzer"
              className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
            >
              <ArrowRight className="h-3 w-3" />
              <span>{t('home.hero.tradeTeaser')}</span>
            </Link>
          </div>

          <div className="mt-2 text-[11px] text-white/55 sm:text-xs">
            <Link
              href="/zen"
              className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
            >
              <ArrowRight className="h-3 w-3" />
              <span>Need a reset? Open Zen Lab for a quick mental break.</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Product path cards */}
      <section className="border-t border-white/10/5 bg-[rgba(0,0,0,0.3)] px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <h2 className="text-sm font-semibold text-white/70 sm:text-base">
            {t('home.products.heading')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Sports App */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: 0.02 }}
              className="flex flex-col justify-between rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-emerald-500/0 p-4 shadow-[0_18px_40px_rgba(16,185,129,0.25)]"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/60 bg-black/40">
                    <AppWindow className="h-4 w-4 text-emerald-300" />
                  </div>
                  <span className="text-sm font-semibold">
                    {t('home.products.app.title')}
                  </span>
                </div>
                <p className="text-xs text-white/75">
                  {t('home.products.app.body')}
                </p>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <Link
                  href="/app"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-emerald-300"
                >
                  <AppWindow className="h-4 w-4" />
                  <span>{t('home.products.app.primary')}</span>
                </Link>
                <div className="flex items-center justify-between gap-2 text-white/80">
                  <Link
                    href="/login?next=/app/home"
                    className="hover:text-white underline-offset-2 hover:underline"
                  >
                    {t('home.products.app.signIn')}
                  </Link>
                  <span className="text-white/30">·</span>
                  <Link
                    href="/signup?next=/app/home"
                    className="hover:text-white underline-offset-2 hover:underline"
                  >
                    {t('home.products.app.signUp')}
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Bracket */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: 0.06 }}
              className="flex flex-col justify-between rounded-2xl border border-sky-500/40 bg-gradient-to-br from-sky-500/20 via-sky-500/5 to-sky-500/0 p-4 shadow-[0_18px_40px_rgba(56,189,248,0.25)]"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/60 bg-black/40">
                    <Trophy className="h-4 w-4 text-sky-300" />
                  </div>
                  <span className="text-sm font-semibold">
                    {t('home.products.bracket.title')}
                  </span>
                </div>
                <p className="text-xs text-white/75">
                  {t('home.products.bracket.body')}
                </p>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <Link
                  href="/bracket"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-sky-300"
                >
                  <Trophy className="h-4 w-4" />
                  <span>{t('home.products.bracket.primary')}</span>
                </Link>
                <div className="flex items-center justify-between gap-2 text-white/80">
                  <Link
                    href="/login?next=/brackets"
                    className="hover:text-white underline-offset-2 hover:underline"
                  >
                    {t('home.products.bracket.signIn')}
                  </Link>
                  <span className="text-white/30">·</span>
                  <Link
                    href="/signup?next=/brackets"
                    className="hover:text-white underline-offset-2 hover:underline"
                  >
                    {t('home.products.bracket.signUp')}
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Legacy */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: 0.1 }}
              className="flex flex-col justify-between rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-amber-500/0 p-4 shadow-[0_18px_40px_rgba(251,191,36,0.3)]"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/60 bg-black/40">
                    <Zap className="h-4 w-4 text-amber-300" />
                  </div>
                  <span className="text-sm font-semibold">
                    {t('home.products.legacy.title')}
                  </span>
                </div>
                <p className="text-xs text-amber-50/85">
                  {t('home.products.legacy.body')}
                </p>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <Link
                  href="/legacy"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-amber-300"
                >
                  <Zap className="h-4 w-4" />
                  <span>{t('home.products.legacy.primary')}</span>
                </Link>
                <div className="flex items-center justify-between gap-2 text-amber-50/90">
                  <Link
                    href="/login?next=/legacy"
                    className="hover:text-white underline-offset-2 hover:underline"
                  >
                    {t('home.products.legacy.signIn')}
                  </Link>
                  <span className="text-amber-200/60">·</span>
                  <Link
                    href="/signup?next=/legacy"
                    className="hover:text-white underline-offset-2 hover:underline"
                  >
                    {t('home.products.legacy.signUp')}
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Product demo section */}
      <ProductDemoSection />

      {/* Homepage interactive analyzer preview */}
      <TradeAnalyzerPreview />

      {/* Trade analyzer teaser */}
      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 rounded-2xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500/15 via-cyan-500/5 to-cyan-500/0 p-5 sm:p-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-white sm:text-base">
                {t('home.trade.title')}
              </h2>
              <p className="text-xs text-white/75 sm:text-sm">
                {t('home.trade.body')}
              </p>
              <p className="text-[11px] text-cyan-100/80 sm:text-xs">
                {t('home.trade.note')}
              </p>
            </div>
            <Link
              href="/trade-analyzer"
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-black shadow-sm hover:bg-cyan-300 sm:mt-0 sm:text-sm"
            >
              <BarChart3 className="h-4 w-4" />
              <span>{t('home.trade.cta')}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="px-4 pb-8 sm:px-6 sm:pb-10">
        <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
          <ul className="grid gap-2 text-xs text-white/70 sm:grid-cols-3 sm:text-sm">
            <li>• {t('home.trust.item1')}</li>
            <li>• {t('home.trust.item2')}</li>
            <li>• {t('home.trust.item3')}</li>
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10/5 py-6 text-xs text-white/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/af-crest.png"
              alt="AllFantasy crest small"
              className="h-5 w-5 rounded-lg border border-white/10 bg-black/40 object-contain"
            />
            <span>© {new Date().getFullYear()} AllFantasy</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/app" className="text-white/55 hover:text-white/90">
              {t('home.footer.nav.app')}
            </Link>
            <span className="text-white/30">•</span>
            <Link href="/bracket" className="text-white/55 hover:text-white/90">
              {t('home.footer.nav.bracket')}
            </Link>
            <span className="text-white/30">•</span>
            <Link href="/legacy" className="text-white/55 hover:text-white/90">
              {t('home.footer.nav.legacy')}
            </Link>
            <span className="text-white/30">•</span>
            <Link
              href="/trade-analyzer"
              className="text-white/55 hover:text-white/90"
            >
              {t('home.footer.nav.trade')}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login" className="text-white/55 hover:text-white/90">
              {t('common.signIn')}
            </Link>
            <span className="text-white/30">•</span>
            <Link href="/signup" className="text-white/55 hover:text-white/90">
              {t('common.signUp')}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

export default function Home() {
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
      <HomeContent />
    </Suspense>
  )
}


'use client'

import React, { Suspense, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Trophy,
  Zap,
  AppWindow,
  BarChart3,
  Bot,
  DraftingCompass,
  TrendingUp,
  Layers3,
  Target,
  Sparkles,
} from 'lucide-react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import HomeTopNav from '@/components/navigation/HomeTopNav'

const POPULAR_TOOLS = [
  {
    key: 'trade',
    icon: BarChart3,
    href: '/trade-analyzer',
    titleKey: 'home.tools.trade.title',
    bodyKey: 'home.tools.trade.body',
    ctaKey: 'home.tools.trade.cta',
  },
  {
    key: 'mockDraft',
    icon: DraftingCompass,
    href: '/mock-draft',
    titleKey: 'home.tools.mockDraft.title',
    bodyKey: 'home.tools.mockDraft.body',
    ctaKey: 'home.tools.mockDraft.cta',
  },
  {
    key: 'waiver',
    icon: Layers3,
    href: '/waiver-ai',
    titleKey: 'home.tools.waiver.title',
    bodyKey: 'home.tools.waiver.body',
    ctaKey: 'home.tools.waiver.cta',
  },
  {
    key: 'draftAssistant',
    icon: Sparkles,
    href: '/af-legacy?tab=mock-draft',
    titleKey: 'home.tools.draftAssistant.title',
    bodyKey: 'home.tools.draftAssistant.body',
    ctaKey: 'home.tools.draftAssistant.cta',
  },
  {
    key: 'matchup',
    icon: Target,
    href: '/app/simulation-lab',
    titleKey: 'home.tools.matchup.title',
    bodyKey: 'home.tools.matchup.body',
    ctaKey: 'home.tools.matchup.cta',
  },
] as const

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

      <HomeTopNav />

      {/* Hero */}
      <section className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 text-center">
          <div className="space-y-4 sm:space-y-5">
            <div className="flex justify-center">
              <img
                src="/af-crest.png"
                alt="AllFantasy Crest"
                className="h-14 w-14 rounded-xl border object-contain sm:h-16 sm:w-16"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t('home.tagline')}
            </p>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              {t('home.title')}
            </h1>
            <p className="mx-auto max-w-xl text-sm text-white/70 sm:text-base">
              {t('home.subtitle')}
            </p>
          </div>

          {/* Stacked vertical CTAs — centered */}
          <div className="flex w-full max-w-xs flex-col items-center gap-3 sm:gap-4">
            <Link
              href="/app"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-semibold text-black shadow-sm hover:bg-emerald-400 transition-colors min-h-[48px]"
            >
              <AppWindow className="h-4 w-4 shrink-0" />
              <span>{t('home.hero.cta.app')}</span>
            </Link>
            <Link
              href="/bracket"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3.5 text-sm font-semibold text-black shadow-sm hover:bg-sky-400 transition-colors min-h-[48px]"
            >
              <Trophy className="h-4 w-4 shrink-0" />
              <span>{t('home.hero.cta.bracket')}</span>
            </Link>
            <Link
              href="/af-legacy"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-semibold text-black shadow-sm hover:bg-amber-300 transition-colors min-h-[48px]"
            >
              <Zap className="h-4 w-4 shrink-0" />
              <span>{t('home.hero.cta.legacy')}</span>
            </Link>
          </div>

          <p className="text-xs text-white/60">
            <Link
              href="/trade-analyzer"
              className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
            >
              <ArrowRight className="h-3 w-3" />
              {t('home.hero.tradeTeaser')}
            </Link>
          </p>
        </div>
      </section>

      {/* Vertical product section — 3 cards */}
      <section className="border-t border-white/10 bg-[rgba(0,0,0,0.2)] px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <h2 className="text-center text-sm font-semibold text-white/80 sm:text-base">
            {t('home.products.heading')}
          </h2>

          {/* Sports App card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25 }}
            className="flex flex-col rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 p-5"
          >
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/60 bg-black/40">
                <AppWindow className="h-5 w-5 text-emerald-300" />
              </div>
              <span className="text-base font-semibold">{t('home.products.app.title')}</span>
            </div>
            <p className="mt-2 text-sm text-white/80">{t('home.products.app.body')}</p>
            <p className="mt-1 text-xs text-emerald-100/90">
              {t('home.products.app.sports')}
            </p>
            <Link
              href="/app"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-300 min-h-[44px]"
            >
              <AppWindow className="h-4 w-4" />
              {t('home.products.app.primary')}
            </Link>
          </motion.div>

          {/* Bracket card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="flex flex-col rounded-2xl border border-sky-500/40 bg-gradient-to-br from-sky-500/15 to-sky-500/5 p-5"
          >
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/60 bg-black/40">
                <Trophy className="h-5 w-5 text-sky-300" />
              </div>
              <span className="text-base font-semibold">{t('home.products.bracket.title')}</span>
            </div>
            <p className="mt-2 text-sm text-white/80">{t('home.products.bracket.body')}</p>
            <Link
              href="/bracket"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-black hover:bg-sky-300 min-h-[44px]"
            >
              <Trophy className="h-4 w-4" />
              {t('home.products.bracket.primary')}
            </Link>
          </motion.div>

          {/* Legacy card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="flex flex-col rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-amber-500/5 p-5"
          >
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/60 bg-black/40">
                <Zap className="h-5 w-5 text-amber-300" />
              </div>
              <span className="text-base font-semibold">{t('home.products.legacy.title')}</span>
            </div>
            <p className="mt-2 text-sm text-amber-50/90">{t('home.products.legacy.body')}</p>
            <Link
              href="/af-legacy"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-black hover:bg-amber-300 min-h-[44px]"
            >
              <Zap className="h-4 w-4" />
              {t('home.products.legacy.primary')}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Popular Fantasy Tools */}
      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-sm font-semibold text-white/90 sm:text-base">
            {t('home.tools.title')}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {POPULAR_TOOLS.map((tool) => {
              const Icon = tool.icon
              return (
                <motion.div
                  key={tool.key}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="flex flex-col rounded-xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex items-center gap-2 text-white">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5">
                      <Icon className="h-4 w-4 text-cyan-300" />
                    </div>
                    <span className="text-sm font-semibold">{t(tool.titleKey)}</span>
                  </div>
                  <p className="mt-2 text-xs text-white/70">{t(tool.bodyKey)}</p>
                  <Link
                    href={tool.href}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/30 min-h-[40px]"
                  >
                    {t(tool.ctaKey)}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </motion.div>
              )
            })}
          </div>
          <p className="mt-4 text-center">
            <Link
              href="/tools-hub"
              className="inline-flex items-center gap-1.5 text-sm font-medium"
              style={{ color: 'var(--accent-cyan)' }}
            >
              See all tools and sports
              <ArrowRight className="h-4 w-4" />
            </Link>
          </p>
        </div>
      </section>

      {/* Engagement: Trending + Quick Tools + Chimmy */}
      <section className="border-t border-white/10 bg-[rgba(0,0,0,0.2)] px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-4xl space-y-10">
          {/* Trending Features */}
          <div>
            <h2 className="text-sm font-semibold text-white/80">{t('home.trending.title')}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              <li>
                <Link
                  href="/app/meta-insights"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  {t('home.trending.players')}
                </Link>
              </li>
              <li>
                <Link
                  href="/af-legacy?tab=mock-draft"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
                >
                  <DraftingCompass className="h-3.5 w-3.5" />
                  {t('home.trending.strategies')}
                </Link>
              </li>
              <li>
                <Link
                  href="/brackets"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
                >
                  <Trophy className="h-3.5 w-3.5" />
                  {t('home.trending.leaderboards')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Tools */}
          <div>
            <h2 className="text-sm font-semibold text-white/80">{t('home.quick.title')}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              <li>
                <Link
                  href="/trade-analyzer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20"
                >
                  {t('home.quick.trade')}
                </Link>
              </li>
              <li>
                <Link
                  href="/mock-draft"
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20"
                >
                  {t('home.quick.mockDraft')}
                </Link>
              </li>
              <li>
                <Link
                  href="/app/power-rankings"
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20"
                >
                  {t('home.quick.rankings')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Chimmy AI */}
          <div className="rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500/15 to-cyan-500/10 p-5">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-400/50 bg-black/40">
                <Bot className="h-6 w-6 text-purple-300" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t('home.chimmy.title')}</h2>
                <p className="mt-0.5 text-sm text-white/80">{t('home.chimmy.body')}</p>
              </div>
            </div>
            <Link
              href="/af-legacy?tab=chat"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-400 min-h-[44px]"
            >
              <Sparkles className="h-4 w-4" />
              {t('home.chimmy.cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="px-4 pb-8 sm:px-6 sm:pb-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
          <ul className="grid gap-2 text-xs text-white/70 sm:grid-cols-3 sm:text-sm">
            <li>• {t('home.trust.item1')}</li>
            <li>• {t('home.trust.item2')}</li>
            <li>• {t('home.trust.item3')}</li>
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-xs text-white/40">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/af-crest.png"
              alt="AllFantasy"
              className="h-5 w-5 rounded-lg border border-white/10 object-contain"
            />
            <span>© {new Date().getFullYear()} AllFantasy</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/tools-hub" className="text-white/55 hover:text-white/90">
              Tools Hub
            </Link>
            <span className="text-white/30">·</span>
            <Link href="/chimmy" className="text-white/55 hover:text-white/90">
              Chimmy AI
            </Link>
            <span className="text-white/30">·</span>
            <Link href="/app" className="text-white/55 hover:text-white/90">
              {t('home.footer.nav.app')}
            </Link>
            <span className="text-white/30">·</span>
            <Link href="/bracket" className="text-white/55 hover:text-white/90">
              {t('home.footer.nav.bracket')}
            </Link>
            <span className="text-white/30">·</span>
            <Link href="/af-legacy" className="text-white/55 hover:text-white/90">
              {t('home.footer.nav.legacy')}
            </Link>
            <span className="text-white/30">·</span>
            <Link href="/trade-analyzer" className="text-white/55 hover:text-white/90">
              {t('home.footer.nav.trade')}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login" className="text-white/55 hover:text-white/90">
              {t('common.signIn')}
            </Link>
            <span className="text-white/30">·</span>
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

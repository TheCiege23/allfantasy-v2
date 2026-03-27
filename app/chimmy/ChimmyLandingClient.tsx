'use client'

import Link from 'next/link'
import HomeTopNav from '@/components/navigation/HomeTopNav'
import SeoLandingFooter from '@/components/landing/SeoLandingFooter'
import { LandingCTAStrip } from '@/components/landing/LandingCTAStrip'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { Bot, Sparkles, BarChart3, DraftingCompass, Layers3, Target, Zap, ArrowRight, AppWindow } from 'lucide-react'
import { getChimmyChatHref } from '@/lib/ai-product-layer'

const FEATURES = [
  { icon: DraftingCompass, title: 'Draft help', body: 'Real-time rankings, strategy tips, and answers to your draft questions.' },
  { icon: BarChart3, title: 'Trade analysis', body: 'Get grades and explanations for trades in your league context.' },
  { icon: Layers3, title: 'Waiver advice', body: 'Pickup and lineup recommendations tuned to your settings.' },
  { icon: Target, title: 'Matchup predictions', body: 'Project outcomes and explore scenarios for your matchups.' },
  { icon: Sparkles, title: 'League storytelling', body: 'Narratives, rivalries, and hall of fame moments for your league.' },
  { icon: Bot, title: 'AI commissioner support', body: 'Sport-specific guidance across NFL, NBA, MLB, NHL, NCAA, and soccer.' },
]

export default function ChimmyLandingClient() {
  const { t } = useLanguage()

  return (
    <main
      className="min-h-screen flex flex-col mode-readable"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <HomeTopNav />

      <article className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-400/40 bg-purple-500/20">
              <Bot className="h-8 w-8 text-purple-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t('home.chimmy.title')}
              </h1>
              <p className="mt-1 text-base" style={{ color: 'var(--muted)' }}>
                Your AI fantasy sports assistant
              </p>
            </div>
          </div>

          <p className="mt-6 text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
            {t('home.chimmy.body')}
          </p>

          <section className="mt-8">
            <LandingCTAStrip
              primaryHref={getChimmyChatHref()}
              primaryLabel={t('home.chimmy.cta')}
              showSignInSignUp
            />
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4">What Chimmy can do</h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((f) => {
                const Icon = f.icon
                return (
                  <li
                    key={f.title}
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'color-mix(in srgb, var(--panel2) 50%, transparent)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-5 w-5 text-purple-400" />
                      <span className="font-semibold">{f.title}</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      {f.body}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-3">Sport-specific guidance</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              Chimmy understands NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, and Soccer.
              Ask about trades, waivers, drafts, and matchups in natural language.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4">Use Chimmy inside AllFantasy</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              Open Messages AI chat to continue league-aware conversations, or launch from AI Hub and tools.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={getChimmyChatHref()}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-400"
              >
                <Sparkles className="h-4 w-4" />
                {t('home.chimmy.cta')}
              </Link>
              <Link
                href="/chimmy/chat"
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                Open Chimmy Chat Route
              </Link>
              <Link
                href="/ai"
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <Zap className="h-4 w-4" />
                AI Hub
              </Link>
              <Link
                href="/af-legacy"
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                Open AllFantasy Legacy
              </Link>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold mb-3">Related tools</h2>
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link href="/tools/trade-analyzer" className="rounded-lg border px-3 py-2 text-sm hover:opacity-90" style={{ borderColor: 'var(--border)' }}>
                  Trade Analyzer
                </Link>
              </li>
              <li>
                <Link href="/tools/ai-draft-assistant" className="rounded-lg border px-3 py-2 text-sm hover:opacity-90" style={{ borderColor: 'var(--border)' }}>
                  AI Draft Assistant
                </Link>
              </li>
              <li>
                <Link href="/tools/waiver-wire-advisor" className="rounded-lg border px-3 py-2 text-sm hover:opacity-90" style={{ borderColor: 'var(--border)' }}>
                  Waiver Advisor
                </Link>
              </li>
              <li>
                <Link href="/tools-hub" className="rounded-lg border px-3 py-2 text-sm hover:opacity-90" style={{ borderColor: 'var(--border)' }}>
                  All tools
                  <ArrowRight className="inline h-3 w-3 ml-1" />
                </Link>
              </li>
            </ul>
          </section>

          <section className="mt-10 rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 50%, transparent)' }}>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--accent-cyan)' }}>
              <AppWindow className="h-4 w-4" />
              Back to AllFantasy Home
            </Link>
          </section>
        </div>
      </article>

      <SeoLandingFooter />
    </main>
  )
}

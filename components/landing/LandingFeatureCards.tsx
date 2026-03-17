'use client'

import Link from 'next/link'
import {
  BarChart3,
  Layers3,
  DraftingCompass,
  Users,
  Target,
  GraduationCap,
  ArrowRight,
} from 'lucide-react'
import { trackLandingCtaClick } from '@/lib/landing-analytics'

const FEATURE_CARDS = [
  {
    title: 'Trade Analyzer',
    description: 'Get AI fairness scores and lineup impact for any trade.',
    href: '/trade-analyzer',
    icon: BarChart3,
  },
  {
    title: 'Waiver Wire AI',
    description: 'Prioritize pickups with AI-powered waiver analysis.',
    href: '/waiver-ai',
    icon: Layers3,
  },
  {
    title: 'Draft Assistant',
    description: 'Mock drafts and draft-day AI recommendations.',
    href: '/mock-draft',
    icon: DraftingCompass,
  },
  {
    title: 'Player Comparison Lab',
    description: 'Compare players side-by-side with projections and trends.',
    href: '/player-comparison-lab',
    icon: Users,
  },
  {
    title: 'Matchup Simulator',
    description: 'Simulate matchups and playoff scenarios.',
    href: '/app/simulation-lab',
    icon: Target,
  },
  {
    title: 'Fantasy Coach',
    description: 'AI coaching and strategy tailored to your league.',
    href: '/app/coach',
    icon: GraduationCap,
  },
] as const

export default function LandingFeatureCards() {
  return (
    <section className="border-t px-4 py-12 sm:px-6 sm:py-16" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 30%, transparent)' }}>
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-lg font-semibold sm:text-xl" style={{ color: 'var(--text)' }}>
          What you can do
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm" style={{ color: 'var(--muted)' }}>
          Leagues, brackets, AI tools, dynasty, and more — all inside the AllFantasy Sports App.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group flex flex-col rounded-2xl border p-5 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
                style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
                onClick={() => trackLandingCtaClick({ cta_label: card.title, cta_destination: card.href, cta_type: 'feature_card', source: 'landing' })}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                    style={{ borderColor: 'var(--border)', background: 'var(--panel2)' }}
                  >
                    <Icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>
                    {card.title}
                  </span>
                </div>
                <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                  {card.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 group-hover:underline">
                  Open tool
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

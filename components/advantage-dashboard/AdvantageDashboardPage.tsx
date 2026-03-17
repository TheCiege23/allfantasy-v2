'use client'

import Link from 'next/link'

/**
 * Fantasy Advantage Dashboard (PROMPT 140).
 * Unified dashboard surfacing the platform's intelligence systems.
 * CLICK AUDIT: Each card links to its related tool (href verified below).
 */
const CARDS = [
  {
    id: 'trend-alerts',
    title: 'Trend alerts',
    description: 'Player trend feed: hot streaks, cold streaks, breakout and sell-high candidates with signals and AI insight.',
    href: '/app/trend-feed',
    label: 'Open Player Trend Feed',
    accent: 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
  },
  {
    id: 'coach-advice',
    title: 'Coach advice',
    description: 'Fantasy coach: lineup, waiver, trade, and strategy recommendations with league context.',
    href: '/app/coach',
    label: 'Open Coach Mode',
    accent: 'from-violet-500/20 to-purple-500/10 border-violet-500/30',
  },
  {
    id: 'power-rankings',
    title: 'Power rankings',
    description: 'Platform and league power rankings: see how you stack up and where your league stands.',
    href: '/app/power-rankings',
    label: 'Open Power Rankings',
    accent: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
  },
  {
    id: 'simulation-insights',
    title: 'Simulation insights',
    description: 'Season, playoff, and dynasty simulations: run scenarios and explore outcomes.',
    href: '/app/simulation-lab',
    label: 'Open Simulation Lab',
    accent: 'from-sky-500/20 to-blue-500/10 border-sky-500/30',
  },
] as const

export default function AdvantageDashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <nav className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/app/home" className="text-slate-400 hover:text-slate-200">
          ← App home
        </Link>
      </nav>
      <h1 className="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
        Fantasy advantage dashboard
      </h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Surface the platform’s intelligence: trend alerts, coach advice, power rankings, and simulation insights.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className={`rounded-xl border bg-gradient-to-br p-4 transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 ${card.accent}`}
            data-advantage-card={card.id}
            data-advantage-href={card.href}
            aria-label={card.label}
          >
            <h2 className="font-medium text-slate-900 dark:text-slate-100">
              {card.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {card.description}
            </p>
            <span className="mt-3 inline-block text-sm font-medium text-slate-700 dark:text-slate-300">
              {card.label} →
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
        Click audit: Trend alerts → /app/trend-feed · Coach advice → /app/coach · Power rankings → /app/power-rankings · Simulation insights → /app/simulation-lab
      </p>
    </main>
  )
}

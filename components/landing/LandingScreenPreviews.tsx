'use client'

import Link from 'next/link'
import { BarChart3, LayoutDashboard, Users } from 'lucide-react'

const PREVIEWS = [
  {
    title: 'Draft room',
    description: 'Live draft board with AI pick suggestions and value tiers.',
    href: '/mock-draft',
    icon: LayoutDashboard,
    snippet: 'Round 5 · Best available: RB, WR · AI suggests: J. Williams',
  },
  {
    title: 'AI analysis',
    description: 'Trade fairness, lineup impact, and clear recommendations.',
    href: '/trade-analyzer',
    icon: BarChart3,
    snippet: 'Fairness 87/100 · Slight edge to Team A · Accept recommended',
  },
  {
    title: 'League dashboard',
    description: 'Rosters, power rankings, and league-wide insights.',
    href: '/app',
    icon: LayoutDashboard,
    snippet: 'Week 6 · Power rankings · Matchup previews · Waiver order',
  },
  {
    title: 'Player comparison',
    description: 'Side-by-side stats, projections, and trend analysis.',
    href: '/player-comparison-lab',
    icon: Users,
    snippet: 'Compare up to 4 players · ROS outlook · Injury & usage',
  },
] as const

export default function LandingScreenPreviews() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-lg font-semibold sm:text-xl" style={{ color: 'var(--text)' }}>
          Example screens
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm" style={{ color: 'var(--muted)' }}>
          Draft room, AI analysis, league dashboard, and player comparison — all in one app.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PREVIEWS.map((preview) => {
            const Icon = preview.icon
            return (
              <Link
                key={preview.href + preview.title}
                href={preview.href}
                className="group flex flex-col rounded-2xl border p-5 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
                style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-emerald-400" />
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>
                    {preview.title}
                  </span>
                </div>
                <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                  {preview.description}
                </p>
                <div
                  className="mt-3 rounded-xl border px-3 py-2 text-xs font-mono"
                  style={{ borderColor: 'var(--border)', background: 'var(--panel2)', color: 'var(--muted)' }}
                >
                  {preview.snippet}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

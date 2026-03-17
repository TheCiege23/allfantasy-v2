'use client'

import { Sparkles, Trophy, GitCompare } from 'lucide-react'
import { StatsCard } from '@/components/landing/StatsCard'

/** Platform usage stats. Replace values with API or env when available. PROMPT 165. */
const PLATFORM_STATS = [
  { label: 'AI analyses run', value: '1M+', icon: Sparkles },
  { label: 'Leagues created', value: '10K+', icon: Trophy },
  { label: 'Player comparisons run', value: '500K+', icon: GitCompare },
] as const

export default function LandingSocialProof() {
  return (
    <section className="border-t px-4 py-12 sm:px-6 sm:py-16" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 30%, transparent)' }}>
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-lg font-semibold sm:text-xl" style={{ color: 'var(--text)' }}>
          Trusted by fantasy managers
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm" style={{ color: 'var(--muted)' }}>
          Platform usage across AllFantasy tools and leagues.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {PLATFORM_STATS.map((stat) => (
            <StatsCard
              key={stat.label}
              value={stat.value}
              label={stat.label}
              icon={stat.icon}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

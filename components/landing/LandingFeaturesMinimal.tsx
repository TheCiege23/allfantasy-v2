'use client'

import Link from 'next/link'
import { Layers3, DraftingCompass, BarChart3, Users, Trophy, Zap } from 'lucide-react'
import { trackLandingCtaClick } from '@/lib/landing-analytics'

const FEATURES = [
  { label: 'Leagues & brackets', href: '/app', icon: Trophy },
  { label: 'Draft assistant & mocks', href: '/mock-draft', icon: DraftingCompass },
  { label: 'Trade analyzer', href: '/trade-analyzer', icon: BarChart3 },
  { label: 'Waiver AI', href: '/waiver-ai', icon: Layers3 },
  { label: 'Player comparison', href: '/player-comparison-lab', icon: Users },
  { label: 'AI coach & tools', href: '/app/coach', icon: Zap },
] as const

export default function LandingFeaturesMinimal() {
  return (
    <section
      className="border-t px-4 py-10 sm:px-6 sm:py-14"
      style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 25%, transparent)' }}
    >
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-base font-semibold sm:text-lg" style={{ color: 'var(--text)' }}>
          What you get
        </h2>
        <p className="mx-auto mt-1 max-w-md text-center text-xs sm:text-sm" style={{ color: 'var(--muted)' }}>
          Leagues, drafts, trades, waivers—all in one place.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {FEATURES.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[var(--bg)] touch-manipulation min-h-[48px]"
              style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
              onClick={() => trackLandingCtaClick({ cta_label: label, cta_destination: href, cta_type: 'feature_card', source: 'landing' })}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                style={{ borderColor: 'var(--border)' }}
              >
                <Icon className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

'use client'

import Link from 'next/link'
import { Scale, ClipboardList, Target, MessageCircle } from 'lucide-react'
import { trackLandingCtaClick } from '@/lib/landing-analytics'

const AI_VALUES = [
  {
    title: 'Trade fairness',
    description: 'AI scores any trade and suggests counter-offers.',
    href: '/trade-analyzer',
    icon: Scale,
  },
  {
    title: 'Waiver picks',
    description: 'Prioritized add/drop list for your league and roster.',
    href: '/waiver-ai',
    icon: ClipboardList,
  },
  {
    title: 'Draft suggestions',
    description: 'Real-time pick recommendations in mock and live drafts.',
    href: '/mock-draft',
    icon: Target,
  },
  {
    title: 'Chimmy assistant',
    description: 'Ask anything about your league and get AI answers.',
    href: '/chimmy',
    icon: MessageCircle,
  },
] as const

export default function LandingAIValue() {
  return (
    <section
      className="border-t px-4 py-10 sm:px-6 sm:py-14"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-base font-semibold sm:text-lg" style={{ color: 'var(--text)' }}>
          AI that helps you win
        </h2>
        <p className="mx-auto mt-1 max-w-md text-center text-xs sm:text-sm" style={{ color: 'var(--muted)' }}>
          Smarter trades, waivers, and drafts—powered by AI.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {AI_VALUES.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col gap-2 rounded-xl border p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[var(--bg)] touch-manipulation min-h-[72px]"
              style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 60%, transparent)' }}
              onClick={() => trackLandingCtaClick({ cta_label: title, cta_destination: href, cta_type: 'ai_value', source: 'landing' })}
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <Icon className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {title}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

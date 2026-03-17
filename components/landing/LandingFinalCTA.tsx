'use client'

import Link from 'next/link'
import { AppWindow, UserPlus } from 'lucide-react'
import { CONVERSION_CTA } from '@/lib/landing-cta'
import { trackLandingCtaClick } from '@/lib/landing-analytics'

const HEADING = 'Start Winning Your League'

export default function LandingFinalCTA() {
  return (
    <section className="border-t px-4 py-12 sm:px-6 sm:py-16" style={{ borderColor: 'var(--border)' }}>
      <div className="mx-auto max-w-2xl rounded-3xl border-2 p-8 text-center sm:p-10" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 50%, transparent)' }}>
        <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: 'var(--text)' }}>
          {HEADING}
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          Join leagues, run drafts, and get AI-powered analysis — all in one place.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href={CONVERSION_CTA.primary.href}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-black shadow-lg hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[var(--bg)] transition-colors"
            onClick={() => trackLandingCtaClick({ cta_label: CONVERSION_CTA.primary.label, cta_destination: CONVERSION_CTA.primary.href, cta_type: 'primary', source: 'final_cta' })}
          >
            <AppWindow className="h-5 w-5 shrink-0" />
            <span>{CONVERSION_CTA.primary.label}</span>
          </Link>
          <Link
            href={CONVERSION_CTA.secondary.href}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 px-6 py-3.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--panel)' }}
            onClick={() => trackLandingCtaClick({ cta_label: CONVERSION_CTA.secondary.label, cta_destination: CONVERSION_CTA.secondary.href, cta_type: 'secondary', source: 'final_cta' })}
          >
            <UserPlus className="h-5 w-5 shrink-0" />
            <span>{CONVERSION_CTA.secondary.label}</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

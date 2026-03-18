'use client'

import Link from 'next/link'
import Image from 'next/image'
import { AppWindow, UserPlus } from 'lucide-react'
import { CONVERSION_CTA } from '@/lib/landing-cta'
import { trackLandingCtaClick } from '@/lib/landing-analytics'

/** Explain the app in ~3 seconds. */
const HEADLINE = 'Fantasy sports with AI. Draft, trade, waivers—win.'
const SUBLINE = 'Leagues, brackets & AI tools for NFL, NBA, MLB, NHL, NCAA, Soccer.'
const TRUST_LINE = 'Free to start · No credit card'

/**
 * HeroLogo — Big, dominant LCP image. Minimal design: logo is the main visual.
 */
export function HeroLogo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center justify-center rounded-2xl hover:opacity-90 active:scale-[0.98] transition-premium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
      aria-label="AllFantasy home"
    >
      <Image
        src="/af-crest.png"
        alt="AllFantasy"
        width={240}
        height={240}
        priority
        sizes="(max-width: 640px) 96px, (max-width: 768px) 128px, (max-width: 1024px) 160px, 200px"
        className="h-24 w-24 min-w-24 sm:h-32 sm:w-32 sm:min-w-32 md:h-40 md:w-40 md:min-w-40 lg:h-[200px] lg:w-[200px] lg:min-w-[200px] rounded-2xl border-2 object-contain"
        style={{ borderColor: 'var(--border)' }}
      />
    </Link>
  )
}

export function HeroTextBlock() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1
        className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl lg:text-5xl max-w-2xl"
        style={{ color: 'var(--text)' }}
      >
        {HEADLINE}
      </h1>
      <p
        className="mx-auto max-w-lg text-sm sm:text-base"
        style={{ color: 'var(--muted)' }}
      >
        {SUBLINE}
      </p>
    </div>
  )
}

export function HeroCTAGroup() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:max-w-none sm:justify-center sm:gap-4">
        <Link
          href={CONVERSION_CTA.primary.href}
          className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 text-base font-semibold text-black shadow-lg hover:bg-emerald-400 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[var(--bg)] transition-premium touch-manipulation"
          onClick={() => trackLandingCtaClick({ cta_label: CONVERSION_CTA.primary.label, cta_destination: CONVERSION_CTA.primary.href, cta_type: 'primary', source: 'hero' })}
        >
          <AppWindow className="h-5 w-5 shrink-0" aria-hidden />
          <span>{CONVERSION_CTA.primary.label}</span>
        </Link>
        <Link
          href={CONVERSION_CTA.secondary.href}
          className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 px-8 py-4 text-base font-semibold hover:opacity-90 active:scale-[0.98] transition-premium focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[var(--bg)] touch-manipulation"
          style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--panel)' }}
          onClick={() => trackLandingCtaClick({ cta_label: CONVERSION_CTA.secondary.label, cta_destination: CONVERSION_CTA.secondary.href, cta_type: 'secondary', source: 'hero' })}
        >
          <UserPlus className="h-5 w-5 shrink-0" aria-hidden />
          <span>{CONVERSION_CTA.secondary.label}</span>
        </Link>
      </div>
      <p className="text-xs" style={{ color: 'var(--muted2)' }}>
        {TRUST_LINE}
      </p>
    </div>
  )
}

/** Legacy exports. */
export const AFLogoLarge = HeroLogo
export function HeroHeadline() {
  return <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl lg:text-5xl max-w-2xl text-center" style={{ color: 'var(--text)' }}>{HEADLINE}</h1>
}
export function HeroSubheadline() {
  return <p className="mx-auto max-w-lg text-xs sm:text-sm text-center" style={{ color: 'var(--muted)' }}>{SUBLINE}</p>
}
export function PrimaryCTA() {
  return (
    <Link href={CONVERSION_CTA.primary.href} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 text-base font-semibold text-black shadow-lg hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[var(--bg)] transition-colors">
      <AppWindow className="h-5 w-5 shrink-0" /><span>{CONVERSION_CTA.primary.label}</span>
    </Link>
  )
}
export function SecondaryCTA() {
  return (
    <Link href={CONVERSION_CTA.secondary.href} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 px-8 py-4 text-base font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[var(--bg)]" style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--panel)' }}>
      <UserPlus className="h-5 w-5 shrink-0" /><span>{CONVERSION_CTA.secondary.label}</span>
    </Link>
  )
}

/**
 * LandingHero — Minimal: big logo, simple message, clear buttons. Explains app in ~3 seconds.
 */
export default function LandingHero() {
  return (
    <section
      className="flex flex-col items-center gap-8 px-4 py-14 sm:gap-10 sm:px-6 sm:py-20 md:py-24"
      aria-label="Hero"
    >
      <HeroLogo />
      <HeroTextBlock />
      <HeroCTAGroup />
    </section>
  )
}

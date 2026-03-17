'use client'

import Link from 'next/link'
import Image from 'next/image'
import { AppWindow, UserPlus } from 'lucide-react'
import { CONVERSION_CTA } from '@/lib/landing-cta'
import { trackLandingCtaClick } from '@/lib/landing-analytics'

const HEADLINE = 'Fantasy Sports With AI Superpowers'
const SUBHEADLINE = 'Analyze trades, draft smarter, dominate waivers, and win your league.'

/**
 * HeroLogo — LCP image; next/image with priority for fast loading. PROMPT 167.
 */
export function HeroLogo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center justify-center rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
      aria-label="AllFantasy home"
    >
      <Image
        src="/af-crest.png"
        alt="AllFantasy"
        width={160}
        height={160}
        priority
        sizes="(max-width: 640px) 96px, (max-width: 768px) 128px, 160px"
        className="h-24 w-24 min-w-[96px] sm:h-32 sm:w-32 sm:min-w-[128px] md:h-40 md:w-40 md:min-w-[160px] rounded-2xl border-2 object-contain"
        style={{ borderColor: 'var(--border)' }}
      />
    </Link>
  )
}

/**
 * HeroTextBlock — Headline + subheadline. Explains the platform in under 3 seconds.
 */
export function HeroTextBlock() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h1
        className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl lg:text-5xl max-w-3xl"
        style={{ color: 'var(--text)' }}
      >
        {HEADLINE}
      </h1>
      <p
        className="mx-auto max-w-xl text-sm sm:text-base"
        style={{ color: 'var(--muted)' }}
      >
        {SUBHEADLINE}
      </p>
    </div>
  )
}

/**
 * HeroCTAGroup — Primary and secondary CTAs. Mobile: stack; Desktop: inline.
 */
export function HeroCTAGroup() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:max-w-none sm:justify-center sm:gap-4">
      <Link
        href={CONVERSION_CTA.primary.href}
        className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-black shadow-lg hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[var(--bg)] transition-colors"
        onClick={() => trackLandingCtaClick({ cta_label: CONVERSION_CTA.primary.label, cta_destination: CONVERSION_CTA.primary.href, cta_type: 'primary', source: 'hero' })}
      >
        <AppWindow className="h-5 w-5 shrink-0" aria-hidden />
        <span>{CONVERSION_CTA.primary.label}</span>
      </Link>
      <Link
        href={CONVERSION_CTA.secondary.href}
        className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 px-6 py-3.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
        style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--panel)' }}
        onClick={() => trackLandingCtaClick({ cta_label: CONVERSION_CTA.secondary.label, cta_destination: CONVERSION_CTA.secondary.href, cta_type: 'secondary', source: 'hero' })}
      >
        <UserPlus className="h-5 w-5 shrink-0" aria-hidden />
        <span>{CONVERSION_CTA.secondary.label}</span>
      </Link>
    </div>
  )
}

/** Legacy exports for backward compatibility. */
export const AFLogoLarge = HeroLogo
export function HeroHeadline() {
  return <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl lg:text-5xl max-w-3xl text-center" style={{ color: 'var(--text)' }}>{HEADLINE}</h1>
}
export function HeroSubheadline() {
  return <p className="mx-auto max-w-xl text-sm sm:text-base text-center" style={{ color: 'var(--muted)' }}>{SUBHEADLINE}</p>
}
export function PrimaryCTA() {
  return (
    <Link href={CONVERSION_CTA.primary.href} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-black shadow-lg hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[var(--bg)] transition-colors">
      <AppWindow className="h-5 w-5 shrink-0" /><span>{CONVERSION_CTA.primary.label}</span>
    </Link>
  )
}
export function SecondaryCTA() {
  return (
    <Link href={CONVERSION_CTA.secondary.href} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 px-6 py-3.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[var(--bg)]" style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--panel)' }}>
      <UserPlus className="h-5 w-5 shrink-0" /><span>{CONVERSION_CTA.secondary.label}</span>
    </Link>
  )
}

/**
 * LandingHero — Logo-dominant, minimal, bold, clean. Mobile-first.
 * Structure: HeroLogo (dominant) → HeroTextBlock → HeroCTAGroup.
 */
export default function LandingHero() {
  return (
    <section
      className="flex flex-col items-center gap-6 px-4 py-10 sm:gap-8 sm:px-6 sm:py-14 md:py-16"
      aria-label="Hero"
    >
      <HeroLogo />
      <HeroTextBlock />
      <HeroCTAGroup />
    </section>
  )
}

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { LogIn, UserPlus, Smartphone } from 'lucide-react'
import { trackLandingCtaClick } from '@/lib/landing-analytics'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import {
  buildLoginHrefWithIntent,
  buildSignupHrefWithIntent,
} from '@/lib/auth/PostAuthIntentRouter'

const SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAA', 'Soccer']

export function HeroLogo() {
  return (
    <Link href="/" aria-label="AllFantasy home" className="focus:outline-none">
      <Image
        src="/af-crest.png"
        alt="AllFantasy"
        width={240}
        height={240}
        priority
        sizes="(max-width: 640px) 96px, (max-width: 768px) 128px, 160px"
        className="h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 rounded-3xl object-contain drop-shadow-[0_0_32px_rgba(16,185,129,0.35)]"
      />
    </Link>
  )
}

export default function LandingHero() {
  const { t } = useLanguage()
  const loginHref = buildLoginHrefWithIntent('/dashboard')
  const signupHref = buildSignupHrefWithIntent('/dashboard')

  return (
    <section
      className="relative flex flex-col items-center gap-8 overflow-hidden px-4 pb-16 pt-14 sm:gap-10 sm:px-6 sm:pb-24 sm:pt-20 md:pt-24"
      aria-label="Hero"
    >
      {/* Colorful gradient background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -right-32 top-0 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <HeroLogo />

      {/* Headline */}
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
          <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
            {t('landing.hero.headline')}
          </span>
        </h1>
        <p className="mx-auto max-w-xl text-sm sm:text-base" style={{ color: 'var(--muted)' }}>
          {t('landing.hero.subline')}
        </p>

        {/* Sport pills */}
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {SPORTS.map((s) => (
            <span
              key={s}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs font-medium text-white/70"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col items-center gap-4 w-full max-w-xs sm:max-w-none">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:w-auto sm:justify-center sm:gap-4">
          <Link
            href={loginHref}
            className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-8 py-4 text-base font-semibold text-black shadow-lg hover:from-cyan-400 hover:to-cyan-300 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[var(--bg)] touch-manipulation"
            onClick={() => trackLandingCtaClick({ cta_label: t('landing.cta.signIn'), cta_destination: loginHref, cta_type: 'primary', source: 'hero' })}
          >
            <LogIn className="h-5 w-5 shrink-0" aria-hidden />
            <span>{t('landing.cta.signIn')}</span>
          </Link>
          <Link
            href={signupHref}
            className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 border-purple-500/50 bg-purple-600/10 px-8 py-4 text-base font-semibold text-purple-300 hover:bg-purple-600/20 hover:border-purple-400 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-[var(--bg)] touch-manipulation"
            onClick={() => trackLandingCtaClick({ cta_label: t('landing.cta.createAccount'), cta_destination: signupHref, cta_type: 'secondary', source: 'hero' })}
          >
            <UserPlus className="h-5 w-5 shrink-0" aria-hidden />
            <span>{t('landing.cta.createAccount')}</span>
          </Link>
        </div>

        {/* Download App (coming soon) */}
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs text-white/50 cursor-default select-none"
          title={t('landing.download.comingSoon')}
        >
          <Smartphone className="h-3.5 w-3.5" />
          {t('landing.download.comingSoon')}
        </button>

        <p className="text-xs" style={{ color: 'var(--muted2)' }}>
          {t('landing.trust.free')}
        </p>
      </div>
    </section>
  )
}

/** Legacy named exports kept for backward compat */
export const AFLogoLarge = HeroLogo
export function HeroTextBlock() { return null }
export function HeroCTAGroup() { return null }
export function HeroHeadline() { return null }
export function HeroSubheadline() { return null }
export function PrimaryCTA() { return null }
export function SecondaryCTA() { return null }

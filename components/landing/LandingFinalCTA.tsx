'use client'

import Link from 'next/link'
import { ArrowRight, UserPlus } from 'lucide-react'
import { trackLandingCtaClick } from '@/lib/landing-analytics'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

export default function LandingFinalCTA() {
  const { t } = useLanguage()
  const openAppHref = '/app'
  const createAccountHref = '/signup'
  const openAppLabel = t('landing.cta.openApp')
  const createAccountLabel = t('landing.cta.createAccount')

  return (
    <section
      className="border-t px-4 py-16 sm:px-6 sm:py-20"
      style={{ borderColor: 'var(--border)', contentVisibility: 'auto', containIntrinsicSize: '420px' }}
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2
          className="text-2xl font-extrabold sm:text-3xl md:text-4xl bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent"
          data-testid="landing-final-cta-heading"
        >
          {t('landing.final.heading')}
        </h2>
        <p className="mt-3 text-sm sm:text-base" style={{ color: 'var(--muted)' }}>
          {t('landing.final.subheading')}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href={openAppHref}
            prefetch={false}
            className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-4 text-base font-semibold text-black shadow-lg hover:from-cyan-400 hover:to-blue-400 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 touch-manipulation"
            onClick={() => trackLandingCtaClick({ cta_label: openAppLabel, cta_destination: openAppHref, cta_type: 'primary', source: 'final_cta' })}
            data-testid="landing-final-open-app-button"
          >
            <ArrowRight className="h-5 w-5 shrink-0" />
            <span>{openAppLabel}</span>
          </Link>
          <Link
            href={createAccountHref}
            prefetch={false}
            className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white/80 hover:bg-white/10 hover:border-white/30 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 touch-manipulation"
            onClick={() => trackLandingCtaClick({ cta_label: createAccountLabel, cta_destination: createAccountHref, cta_type: 'secondary', source: 'final_cta' })}
            data-testid="landing-final-create-account-button"
          >
            <UserPlus className="h-5 w-5 shrink-0" />
            <span>{createAccountLabel}</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

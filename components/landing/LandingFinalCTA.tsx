'use client'

import Link from 'next/link'
import { LogIn, UserPlus, Smartphone } from 'lucide-react'
import { trackLandingCtaClick } from '@/lib/landing-analytics'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

export default function LandingFinalCTA() {
  const { t } = useLanguage()

  return (
    <section className="border-t px-4 py-16 sm:px-6 sm:py-20" style={{ borderColor: 'var(--border)' }}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-extrabold sm:text-3xl md:text-4xl bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
          {t('landing.final.heading')}
        </h2>
        <p className="mt-3 text-sm sm:text-base" style={{ color: 'var(--muted)' }}>
          {t('landing.final.subheading')}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/signup"
            className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:from-cyan-400 hover:to-purple-500 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 touch-manipulation"
            onClick={() => trackLandingCtaClick({ cta_label: t('landing.cta.createAccount'), cta_destination: '/signup', cta_type: 'primary', source: 'final_cta' })}
          >
            <UserPlus className="h-5 w-5 shrink-0" />
            <span>{t('landing.cta.createAccount')}</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white/80 hover:bg-white/10 hover:border-white/30 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 touch-manipulation"
            onClick={() => trackLandingCtaClick({ cta_label: t('landing.cta.signIn'), cta_destination: '/login', cta_type: 'secondary', source: 'final_cta' })}
          >
            <LogIn className="h-5 w-5 shrink-0" />
            <span>{t('landing.cta.signIn')}</span>
          </Link>
        </div>

        {/* Download App coming soon */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs text-white/40 cursor-default select-none"
            title={t('landing.download.comingSoon')}
          >
            <Smartphone className="h-3.5 w-3.5" />
            {t('landing.download.comingSoon')}
          </button>
        </div>

        <p className="mt-4 text-xs" style={{ color: 'var(--muted2)' }}>
          {t('landing.final.trust')}
        </p>
      </div>
    </section>
  )
}

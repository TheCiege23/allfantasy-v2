'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import HomeTopNav from '@/components/navigation/HomeTopNav'
import LandingHero from '@/components/landing/LandingHero'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { trackLandingCtaClick } from '@/lib/landing-analytics'

function SectionFallback() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16" aria-hidden>
      <div className="mx-auto h-36 max-w-4xl rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
    </section>
  )
}

const LandingFeatureCards = dynamic(() => import('@/components/landing/LandingFeatureCards'), {
  loading: () => <SectionFallback />,
})
const LandingScreenPreviews = dynamic(() => import('@/components/landing/LandingScreenPreviews'), {
  loading: () => <SectionFallback />,
})
const LandingConversionEngines = dynamic(() => import('@/components/landing/LandingConversionEngines'), {
  loading: () => <SectionFallback />,
})
const LandingSocialProof = dynamic(() => import('@/components/landing/LandingSocialProof'), {
  loading: () => <SectionFallback />,
})
const LandingFinalCTA = dynamic(() => import('@/components/landing/LandingFinalCTA'), {
  loading: () => <SectionFallback />,
})

export default function LandingPageClient() {
  const { t } = useLanguage()

  return (
    <main
      className="min-h-screen flex flex-col mode-readable pb-20 sm:pb-0"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <HomeTopNav />
      <LandingHero />
      <LandingFeatureCards />
      <LandingScreenPreviews />
      <LandingConversionEngines />
      <LandingSocialProof />
      <LandingFinalCTA />

      <footer
        className="border-t py-6 text-xs"
        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="AllFantasy home">
            <Image
              src="/af-crest.png"
              alt=""
              width={20}
              height={20}
              className="rounded-lg border object-contain"
              style={{ borderColor: 'var(--border)' }}
              sizes="20px"
            />
            <span>© {new Date().getFullYear()} AllFantasy</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              prefetch={false}
              className="hover:underline"
              data-testid="landing-footer-sign-up-link"
              onClick={() =>
                trackLandingCtaClick({
                  cta_label: t('landing.cta.createAccount'),
                  cta_destination: '/signup',
                  cta_type: 'secondary',
                  source: 'footer',
                })
              }
            >
              {t('landing.cta.createAccount')}
            </Link>
            <Link
              href="/app"
              prefetch={false}
              className="hover:underline"
              data-testid="landing-footer-open-app-link"
              onClick={() =>
                trackLandingCtaClick({
                  cta_label: t('landing.cta.openApp'),
                  cta_destination: '/app',
                  cta_type: 'primary',
                  source: 'footer',
                })
              }
            >
              {t('landing.cta.openApp')}
            </Link>
            <Link href="/privacy" prefetch={false} className="hover:underline">
              {t('landing.footer.privacy')}
            </Link>
            <Link href="/terms" prefetch={false} className="hover:underline">
              {t('landing.footer.terms')}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

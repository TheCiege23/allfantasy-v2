'use client'

import { Suspense, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import HomeTopNav from '@/components/navigation/HomeTopNav'
import LandingHero from '@/components/landing/LandingHero'
import { CONVERSION_CTA } from '@/lib/landing-cta'
import { trackLandingCtaClick } from '@/lib/landing-analytics'

/** Below-the-fold: minimal features, AI value, final CTA. PROMPT 282 — minimal landing. */
const LandingFeaturesMinimal = dynamic(
  () => import('@/components/landing/LandingFeaturesMinimal').then((m) => m.default),
  { ssr: true, loading: () => <SectionSkeleton /> }
)
const LandingAIValue = dynamic(
  () => import('@/components/landing/LandingAIValue').then((m) => m.default),
  { ssr: true, loading: () => <SectionSkeleton /> }
)
const LandingFinalCTA = dynamic(
  () => import('@/components/landing/LandingFinalCTA').then((m) => m.default),
  { ssr: true, loading: () => <SectionSkeleton /> }
)

function SectionSkeleton() {
  return (
    <section className="min-h-[160px] border-t px-4 py-12 sm:px-6" style={{ borderColor: 'var(--border)' }}>
      <div className="mx-auto max-w-3xl animate-pulse rounded-xl" style={{ background: 'color-mix(in srgb, var(--panel) 40%, transparent)', height: 140 }} />
    </section>
  )
}

const SUPPORTED_SPORTS = ['NFL', 'NHL', 'NBA', 'MLB', 'NCAA Basketball', 'NCAA Football', 'Soccer']

function LandingContent() {
  const jsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'AllFantasy',
      applicationCategory: 'SportsApplication',
      operatingSystem: 'Web',
      description:
        'Fantasy sports with AI. Draft, trade, waivers—win. Leagues, brackets and AI tools for NFL, NBA, MLB, NHL, NCAA, Soccer.',
      url: 'https://allfantasy.ai/',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    }),
    []
  )

  return (
    <main
      className="min-h-screen flex flex-col mode-readable"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <HomeTopNav />

      <LandingHero />
      <LandingFeaturesMinimal />
      <LandingAIValue />
      <LandingFinalCTA />

      <footer className="border-t py-6 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
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
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span style={{ color: 'var(--muted)' }}>Sports: {SUPPORTED_SPORTS.join(', ')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/app" className="hover:underline">
              App
            </Link>
            <Link
              href={CONVERSION_CTA.secondary.href}
              className="hover:underline"
              onClick={() => trackLandingCtaClick({ cta_label: CONVERSION_CTA.secondary.label, cta_destination: CONVERSION_CTA.secondary.href, cta_type: 'secondary', source: 'footer' })}
            >
              Sign up
            </Link>
            <Link href="/login" className="hover:underline">
              Sign in
            </Link>
            <Link href="/tools-hub" className="hover:underline">
              Tools Hub
            </Link>
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >
          <div style={{ color: 'var(--muted)' }}>Loading...</div>
        </main>
      }
    >
      <LandingContent />
    </Suspense>
  )
}

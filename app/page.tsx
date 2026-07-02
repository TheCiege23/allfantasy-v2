import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { PageJsonLd } from '@/components/seo/JsonLd'
import { LandingInviteCapture } from '@/components/landing/LandingInviteCapture'
import { getHomeInitialSession } from '@/lib/landing/get-home-initial-session'

/**
 * Client-only: SSR-bundling this module on Windows Next 14.2 reliably hits
 * webpack-runtime `reading 'call'` at `next/image` and can corrupt `.next-dev-local`
 * manifests (`React Client Manifest` / `entryCSSFiles` / empty JSON).
 */
const LandingPageClient = dynamic(() => import('@/components/landing/LandingPageClient'), {
  ssr: false,
  loading: () => (
    <div
      className="mode-readable flex min-h-[40vh] items-center justify-center text-sm"
      style={{ background: 'var(--bg)', color: 'var(--muted)' }}
    >
      Loading…
    </div>
  ),
})
import {
  buildSeoMeta,
  getSoftwareApplicationSchema,
  getWebPageSchema,
} from '@/lib/seo'

export const metadata: Metadata = buildSeoMeta({
  title: 'AllFantasy.ai — The Intelligence Platform for Fantasy Sports | NFL, NBA, NHL, MLB & More',
  description:
    'AllFantasy.ai turns real league and user data into better decisions for players, commissioners, and fantasy platforms. League intelligence, trade analysis, waiver tools, and draft help across NFL, NBA, NHL, MLB, NCAA, and Soccer.',
  canonicalPath: '/',
  openGraphTitle: 'AllFantasy.ai — The Intelligence Platform for Fantasy Sports',
  openGraphDescription:
    'Real league and user data, turned into better decisions. League health, trade analysis, waiver tools, and draft help for serious managers and commissioners.',
  twitterTitle: 'AllFantasy.ai — The Intelligence Platform for Fantasy Sports',
  twitterDescription: 'Real data. Better decisions. Healthier fantasy leagues.',
  imagePath: '/af-crest.png',
  keywords: [
    'fantasy sports intelligence',
    'fantasy football',
    'fantasy basketball',
    'league intelligence',
    'trade analyzer',
    'waiver wire tools',
    'draft assistant',
    'dynasty fantasy',
    'devy fantasy',
    'AllFantasy',
  ],
})

const HOME_WEBPAGE_SCHEMA = getWebPageSchema({
  name: 'AllFantasy.ai',
  description:
    'The intelligence platform for fantasy sports — NFL, NBA, NHL, MLB, NCAA, and Soccer — with league intelligence, trade analysis, waiver tools, and commissioner tools.',
  url: '/',
})

const HOME_SOFTWARE_APP_SCHEMA = getSoftwareApplicationSchema({
  name: 'AllFantasy.ai',
  description:
    'The intelligence platform for fantasy sports. League intelligence, trade analyzer, waiver tools, and draft assistant for serious managers and commissioners.',
  url: 'https://allfantasy.ai/',
  applicationCategory: 'SportsApplication',
})

export default async function HomePage() {
  const initialSession = await getHomeInitialSession()
  if (initialSession?.user) {
    redirect('/dashboard')
  }

  return (
    <>
      <PageJsonLd schemas={[HOME_WEBPAGE_SCHEMA, HOME_SOFTWARE_APP_SCHEMA]} />
      <Suspense fallback={null}>
        <LandingInviteCapture />
      </Suspense>
      <LandingPageClient initialSession={initialSession} />
    </>
  )
}

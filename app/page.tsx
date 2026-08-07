import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { PageJsonLd } from '@/components/seo/JsonLd'
import { LandingInviteCapture } from '@/components/landing/LandingInviteCapture'
import { LandingViewBeacon } from '@/components/landing/LandingViewBeacon'
import { getHomeInitialSession } from '@/lib/landing/get-home-initial-session'
import LandingNocturne from '@/components/landing/nocturne/LandingNocturne'
import {
  buildSeoMeta,
  getSoftwareApplicationSchema,
  getWebPageSchema,
} from '@/lib/seo'

/**
 * Landing page (Nocturne "1a" design). Replaces the legacy scrollytelling
 * `LandingPageClient`, which stays on disk for one-line rollback.
 *
 * Server-rendered: `LandingNocturne` is a client component but is now STATICALLY
 * imported (not `dynamic(..., { ssr: false })`), so its full marketing HTML —
 * headline, platform copy, features, pricing, commissioner content — ships in the
 * server response for crawlers and link previews instead of a "Loading…" shell.
 *
 * The prior `ssr: false` existed only to dodge a Windows Next 14.2 webpack crash
 * (`reading 'call'` at `next/image`) when SSR-bundling this module. That trigger is
 * gone: the Nocturne components now use plain <img> for their few brand PNGs rather
 * than next/image, so the module SSR-bundles cleanly. If that webpack crash ever
 * resurfaces, the one-line rollback is to wrap this import in
 * `dynamic(() => import(...), { ssr: false })` again.
 */

export const metadata: Metadata = buildSeoMeta({
  title: 'AllFantasy.ai — Run Your League. Win Your League. | NFL, NBA, NHL, MLB & More',
  description:
    'AllFantasy.ai is the commissioner-first fantasy sports platform for serious managers. Build your league, draft live, manage trades and waivers, and chase the championship across NFL, NBA, NHL, MLB, NCAA, and Soccer.',
  canonicalPath: '/',
  openGraphTitle: 'AllFantasy.ai — Run Your League. Win Your League.',
  openGraphDescription:
    'The commissioner-first fantasy sports platform for serious managers. Live drafts, trades, waivers, standings, and championships — across every sport you play.',
  twitterTitle: 'AllFantasy.ai — Run Your League. Win Your League.',
  twitterDescription: 'The commissioner-first fantasy sports platform for serious managers.',
  imagePath: '/af-crest.png',
  keywords: [
    'fantasy sports',
    'fantasy football',
    'fantasy basketball',
    'trade analyzer',
    'waiver wire',
    'draft assistant',
    'dynasty fantasy',
    'devy fantasy',
    'fantasy league commissioner',
    'AllFantasy',
  ],
})

const HOME_WEBPAGE_SCHEMA = getWebPageSchema({
  name: 'AllFantasy.ai',
  description:
    'Commissioner-first fantasy sports platform for NFL, NBA, NHL, MLB, NCAA, and Soccer with league management, live drafts, trades, and waiver tools.',
  url: '/',
})

const HOME_SOFTWARE_APP_SCHEMA = getSoftwareApplicationSchema({
  name: 'AllFantasy.ai',
  description:
    'Commissioner-first fantasy sports platform for serious managers with league management, live drafts, trade tools, and waiver wire tracking.',
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
      {/*
        Mounted below the signed-in redirect above, so an authenticated user bounced to
        /dashboard never records a landing view — that is a returning session, not
        campaign-driven acquisition.
      */}
      <LandingViewBeacon landingPath="/" />
      <LandingNocturne initialSession={initialSession} />
    </>
  )
}

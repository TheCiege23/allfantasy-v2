import type { Metadata } from 'next'
import LandingPageClient from '@/components/landing/LandingPageClient'
import { buildSeoMeta } from '@/lib/seo'
import { getSoftwareApplicationSchema, getWebPageSchema } from '@/lib/seo'
import { PageJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = buildSeoMeta({
  title: 'AllFantasy Sports App – Fantasy Sports With AI Superpowers',
  description:
    'AllFantasy combines fantasy leagues, bracket challenges, and AI tools to help you draft smarter, analyze trades, dominate waivers, and win your league.',
  canonicalPath: '/',
  openGraphTitle: 'AllFantasy Sports App',
  openGraphDescription:
    'Fantasy sports with AI superpowers across leagues, brackets, waivers, draft prep, and advanced analytics.',
  twitterTitle: 'AllFantasy Sports App',
  twitterDescription: 'Draft smarter, analyze trades, dominate waivers, and win your league.',
})

const HOME_WEBPAGE_SCHEMA = getWebPageSchema({
  name: 'AllFantasy Sports App',
  description:
    'Fantasy sports platform with AI-powered analysis for trades, waivers, draft prep, bracket strategy, and league management.',
  url: '/',
})

const HOME_SOFTWARE_APP_SCHEMA = getSoftwareApplicationSchema({
  name: 'AllFantasy Sports App',
  description:
    'AI-powered fantasy sports tools for leagues, brackets, draft prep, waivers, trade analysis, and in-season optimization.',
  url: 'https://allfantasy.ai/',
  applicationCategory: 'SportsApplication',
})

export default function HomePage() {
  return (
    <>
      <PageJsonLd schemas={[HOME_WEBPAGE_SCHEMA, HOME_SOFTWARE_APP_SCHEMA]} />
      <LandingPageClient />
    </>
  )
}

import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { PageJsonLd } from '@/components/seo/JsonLd'
import {
  buildSeoMeta,
  getSoftwareApplicationSchema,
  getWebPageSchema,
} from '@/lib/seo'

/**
 * Lazy chunk for the landing client avoids Next 14 static prerender failing with
 * webpack-runtime `Cannot read properties of undefined (reading 'call')` during RSC Flight deserialization.
 * Keep all imports above — do not place `export const` between import lines.
 */
const LandingPageClient = dynamic(() => import('@/components/landing/LandingPageClient'), {
  ssr: true,
})

export const metadata: Metadata = buildSeoMeta({
  title: 'AllFantasy.ai — AI-Powered Fantasy Sports | NFL, NBA, NHL, MLB & More',
  description:
    'AllFantasy.ai is the AI-powered fantasy sports platform for serious managers. Analyze trades, dominate waivers, draft smarter, and win your league across NFL, NBA, NHL, MLB, NCAA, and Soccer.',
  canonicalPath: '/',
  openGraphTitle: 'AllFantasy.ai — Fantasy Sports With AI Superpowers',
  openGraphDescription:
    'The AI-powered fantasy sports platform for serious managers. Trade analysis, waiver AI, draft assistant, dynasty tools, and more.',
  twitterTitle: 'AllFantasy.ai — Fantasy Sports With AI Superpowers',
  twitterDescription: 'The AI-powered fantasy sports platform for serious managers.',
  imagePath: '/af-crest.png',
  keywords: [
    'AI fantasy sports',
    'fantasy football AI',
    'fantasy basketball',
    'trade analyzer AI',
    'waiver wire AI',
    'draft assistant',
    'dynasty fantasy',
    'devy fantasy',
    'AllFantasy',
  ],
})

const HOME_WEBPAGE_SCHEMA = getWebPageSchema({
  name: 'AllFantasy.ai',
  description:
    'AI-powered fantasy sports platform for NFL, NBA, NHL, MLB, NCAA, and Soccer with trade analysis, waiver tools, draft help, and league management.',
  url: '/',
})

const HOME_SOFTWARE_APP_SCHEMA = getSoftwareApplicationSchema({
  name: 'AllFantasy.ai',
  description:
    'AI-powered fantasy sports platform for serious managers with trade analyzer, waiver wire AI, draft assistant, and Chimmy AI coaching.',
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

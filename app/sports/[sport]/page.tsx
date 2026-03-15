import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  SPORT_SLUGS,
  SPORT_CONFIG,
  getSportCanonical,
  type SportSlug,
} from '@/lib/seo-landing/config'
import SportLandingClient from './SportLandingClient'

const BASE = 'https://allfantasy.ai'

export async function generateStaticParams() {
  return SPORT_SLUGS.map((sport) => ({ sport }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string }>
}): Promise<Metadata> {
  const { sport } = await params
  const config = SPORT_CONFIG[sport as SportSlug]
  if (!config) return { title: 'AllFantasy – Fantasy Sports Tools' }

  const canonical = getSportCanonical(config.slug)
  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    alternates: { canonical },
    openGraph: {
      title: config.title,
      description: config.description,
      url: canonical,
      siteName: 'AllFantasy',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: config.title,
      description: config.description,
    },
    robots: { index: true, follow: true },
  }
}

export default async function SportPage({
  params,
}: {
  params: Promise<{ sport: string }>
}) {
  const { sport } = await params
  if (!SPORT_SLUGS.includes(sport as SportSlug)) notFound()
  const config = SPORT_CONFIG[sport as SportSlug]
  return <SportLandingClient config={config} />
}

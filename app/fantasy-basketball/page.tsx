import type { Metadata } from 'next'
import SportSeoLanding from '@/components/seo/SportSeoLanding'
import {
  SPORT_PAGE_CONFIG,
  getSportPageCanonical,
  getSportPageJsonLd,
} from '@/lib/seo-landing/sport-pages'
import { buildSeoMeta } from '@/lib/seo'

const slug = 'fantasy-basketball'
const config = SPORT_PAGE_CONFIG[slug]

export const metadata: Metadata = buildSeoMeta({
  title: config.title,
  description: config.description,
  canonical: getSportPageCanonical(slug),
  keywords: config.keywords,
})

export default function FantasyBasketballPage() {
  const jsonLd = getSportPageJsonLd(slug)
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SportSeoLanding config={config} />
    </>
  )
}

import type { Metadata } from 'next'
import SportSeoLanding from '@/components/seo/SportSeoLanding'
import { SPORT_PAGE_CONFIG, getSportPageCanonical } from '@/lib/seo-landing/sport-pages'

const config = SPORT_PAGE_CONFIG['fantasy-soccer']

export const metadata: Metadata = {
  title: config.title,
  description: config.description,
  keywords: config.keywords,
  alternates: { canonical: getSportPageCanonical('fantasy-soccer') },
  openGraph: {
    title: config.title,
    description: config.description,
    url: getSportPageCanonical('fantasy-soccer'),
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

export default function FantasySoccerPage() {
  return <SportSeoLanding config={config} />
}

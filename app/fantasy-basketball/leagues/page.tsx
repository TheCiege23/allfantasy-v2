import type { Metadata } from 'next'
import { buildSeoMeta } from '@/lib/seo/meta'
import {
  DISCOVERY_LEAGUES_PAGE_CONFIG,
  getDiscoveryLeaguesCanonical,
} from '@/lib/seo-landing/discovery-leagues-pages'
import DiscoveryLeaguesSeoLanding from '@/components/seo/DiscoveryLeaguesSeoLanding'

const config = DISCOVERY_LEAGUES_PAGE_CONFIG['fantasy-basketball']

export const metadata: Metadata = buildSeoMeta({
  title: config.title,
  description: config.description,
  canonicalPath: `/fantasy-basketball/leagues`,
  canonical: getDiscoveryLeaguesCanonical('fantasy-basketball'),
  keywords: config.keywords,
})

export default function FantasyBasketballLeaguesPage() {
  return <DiscoveryLeaguesSeoLanding config={config} />
}

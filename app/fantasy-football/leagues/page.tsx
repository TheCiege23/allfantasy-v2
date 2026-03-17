import type { Metadata } from 'next'
import { buildSeoMeta } from '@/lib/seo/meta'
import {
  DISCOVERY_LEAGUES_PAGE_CONFIG,
  getDiscoveryLeaguesCanonical,
} from '@/lib/seo-landing/discovery-leagues-pages'
import DiscoveryLeaguesSeoLanding from '@/components/seo/DiscoveryLeaguesSeoLanding'

const config = DISCOVERY_LEAGUES_PAGE_CONFIG['fantasy-football']

export const metadata: Metadata = buildSeoMeta({
  title: config.title,
  description: config.description,
  canonicalPath: `/fantasy-football/leagues`,
  canonical: getDiscoveryLeaguesCanonical('fantasy-football'),
  keywords: config.keywords,
})

export default function FantasyFootballLeaguesPage() {
  return <DiscoveryLeaguesSeoLanding config={config} />
}

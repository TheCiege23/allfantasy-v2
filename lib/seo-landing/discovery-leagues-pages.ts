/**
 * PROMPT 229 — Discovery SEO pages for fantasy football, basketball, and baseball leagues.
 * Routes: /fantasy-football/leagues, /fantasy-basketball/leagues, /fantasy-baseball/leagues
 */

const BASE = 'https://allfantasy.ai'

export type DiscoveryLeaguesSlug = 'fantasy-football' | 'fantasy-basketball' | 'fantasy-baseball'

export interface DiscoveryLeaguesPageConfig {
  slug: DiscoveryLeaguesSlug
  title: string
  description: string
  headline: string
  body: string
  /** Path to discover leagues filtered by this sport (e.g. /discover/leagues/nfl). */
  discoverHref: string
  keywords: string[]
}

export const DISCOVERY_LEAGUES_SLUGS: DiscoveryLeaguesSlug[] = [
  'fantasy-football',
  'fantasy-basketball',
  'fantasy-baseball',
]

export const DISCOVERY_LEAGUES_PAGE_CONFIG: Record<DiscoveryLeaguesSlug, DiscoveryLeaguesPageConfig> = {
  'fantasy-football': {
    slug: 'fantasy-football',
    title: 'Fantasy Football Leagues – Find & Join NFL Leagues | AllFantasy',
    description:
      'Discover and join fantasy football leagues on AllFantasy. Browse public NFL leagues, creator leagues, and open leagues. AI tools for drafts, trades, and waivers included.',
    headline: 'Fantasy Football Leagues',
    body:
      'Find and join fantasy football leagues that fit your style. AllFantasy hosts public and creator-run NFL leagues you can browse by format and join before they fill. Every league comes with AI trade analysis, mock drafts, and waiver advice so you can compete with better tools.',
    discoverHref: '/discover/leagues/nfl',
    keywords: [
      'fantasy football leagues',
      'NFL fantasy leagues',
      'join fantasy football league',
      'public fantasy football leagues',
      'fantasy football league finder',
    ],
  },
  'fantasy-basketball': {
    slug: 'fantasy-basketball',
    title: 'Fantasy Basketball Leagues – Find & Join NBA Leagues | AllFantasy',
    description:
      'Discover and join fantasy basketball leagues on AllFantasy. Browse public NBA leagues, creator leagues, and open leagues. AI tools for trades, waivers, and power rankings included.',
    headline: 'Fantasy Basketball Leagues',
    body:
      'Find and join fantasy basketball leagues that fit your style. AllFantasy hosts public and creator-run NBA leagues you can browse by format and join before they fill. Every league comes with AI trade analysis, waiver advice, and power rankings so you can compete with better tools.',
    discoverHref: '/discover/leagues/nba',
    keywords: [
      'fantasy basketball leagues',
      'NBA fantasy leagues',
      'join fantasy basketball league',
      'public fantasy basketball leagues',
      'fantasy basketball league finder',
    ],
  },
  'fantasy-baseball': {
    slug: 'fantasy-baseball',
    title: 'Fantasy Baseball Leagues – Find & Join MLB Leagues | AllFantasy',
    description:
      'Discover and join fantasy baseball leagues on AllFantasy. Browse public MLB leagues, creator leagues, and open leagues. AI tools for trades, waivers, and dynasty included.',
    headline: 'Fantasy Baseball Leagues',
    body:
      'Find and join fantasy baseball leagues that fit your style. AllFantasy hosts public and creator-run MLB leagues you can browse by format and join before they fill. Every league comes with AI trade analysis, waiver advice, and Chimmy AI so you can compete with better tools.',
    discoverHref: '/discover/leagues/mlb',
    keywords: [
      'fantasy baseball leagues',
      'MLB fantasy leagues',
      'join fantasy baseball league',
      'public fantasy baseball leagues',
      'fantasy baseball league finder',
    ],
  },
}

export function getDiscoveryLeaguesCanonical(slug: DiscoveryLeaguesSlug): string {
  return `${BASE}/${slug}/leagues`
}

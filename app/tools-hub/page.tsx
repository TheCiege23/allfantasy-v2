import type { Metadata } from 'next'
import {
  TOOLS_HUB_TITLE,
  TOOLS_HUB_DESCRIPTION,
  SPORT_SLUGS,
  TOOL_SLUGS,
  SPORT_CONFIG,
  TOOL_CONFIG,
} from '@/lib/seo-landing/config'
import ToolsHubClient from './ToolsHubClient'

const BASE = 'https://allfantasy.ai'

export const metadata: Metadata = {
  title: TOOLS_HUB_TITLE,
  description: TOOLS_HUB_DESCRIPTION,
  alternates: { canonical: `${BASE}/tools-hub` },
  openGraph: {
    title: TOOLS_HUB_TITLE,
    description: TOOLS_HUB_DESCRIPTION,
    url: `${BASE}/tools-hub`,
    siteName: 'AllFantasy',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TOOLS_HUB_TITLE,
    description: TOOLS_HUB_DESCRIPTION,
  },
  robots: { index: true, follow: true },
}

export default function ToolsHubPage() {
  const sports = SPORT_SLUGS.map((slug) => ({ slug, headline: SPORT_CONFIG[slug].headline }))
  const tools = TOOL_SLUGS.map((slug) => ({ slug, headline: TOOL_CONFIG[slug].headline, openToolHref: TOOL_CONFIG[slug].openToolHref }))
  return <ToolsHubClient sports={sports} tools={tools} />
}

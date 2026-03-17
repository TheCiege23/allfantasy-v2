import type { Metadata } from 'next'
import AIToolSeoLanding from '@/components/seo/AIToolSeoLanding'
import { AI_TOOL_PAGES, getAIToolPageCanonical } from '@/lib/seo-landing/ai-tool-pages'

const config = AI_TOOL_PAGES['player-comparison']

export const metadata: Metadata = {
  title: config.title,
  description: config.description,
  alternates: { canonical: getAIToolPageCanonical('player-comparison') },
  openGraph: {
    title: config.title,
    description: config.description,
    url: getAIToolPageCanonical('player-comparison'),
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

export default function PlayerComparisonPage() {
  return <AIToolSeoLanding config={config} />
}

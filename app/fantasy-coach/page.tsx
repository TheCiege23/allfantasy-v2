import type { Metadata } from 'next'
import AIToolSeoLanding from '@/components/seo/AIToolSeoLanding'
import { AI_TOOL_PAGES, getAIToolPageCanonical } from '@/lib/seo-landing/ai-tool-pages'

const config = AI_TOOL_PAGES['fantasy-coach']

export const metadata: Metadata = {
  title: config.title,
  description: config.description,
  alternates: { canonical: getAIToolPageCanonical('fantasy-coach') },
  openGraph: {
    title: config.title,
    description: config.description,
    url: getAIToolPageCanonical('fantasy-coach'),
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

export default function FantasyCoachPage() {
  return <AIToolSeoLanding config={config} />
}

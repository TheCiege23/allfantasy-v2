import type { Metadata } from 'next'
import AIToolSeoLanding from '@/components/seo/AIToolSeoLanding'
import { LandingToolVisitTracker } from '@/components/landing/LandingToolVisitTracker'
import { AI_TOOL_PAGES, getAIToolPageCanonical, getAIToolPageJsonLd } from '@/lib/seo-landing/ai-tool-pages'
import { buildSeoMeta } from '@/lib/seo'

const slug = 'war-room'
const config = AI_TOOL_PAGES[slug]

export const metadata: Metadata = buildSeoMeta({
  title: config.title,
  description: config.description,
  canonical: getAIToolPageCanonical(slug),
})

export default function WarRoomPage() {
  const jsonLd = getAIToolPageJsonLd(slug)
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingToolVisitTracker path="/war-room" toolName="Draft War Room" />
      <AIToolSeoLanding config={config} />
    </>
  )
}

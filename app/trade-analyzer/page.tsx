import type { Metadata } from 'next'
import AIToolSeoLanding from '@/components/seo/AIToolSeoLanding'
import { LandingToolVisitTracker } from '@/components/landing/LandingToolVisitTracker'
import EngagementEventTracker from '@/components/engagement/EngagementEventTracker'
import { AI_TOOL_PAGES, getAIToolPageCanonical, getAIToolPageJsonLd } from '@/lib/seo-landing/ai-tool-pages'
import { buildSeoMeta } from '@/lib/seo'

const slug = 'trade-analyzer'
const config = AI_TOOL_PAGES[slug]

export const metadata: Metadata = buildSeoMeta({
  title: config.title,
  description: config.description,
  canonical: getAIToolPageCanonical(slug),
})

export default function TradeAnalyzerPage() {
  const jsonLd = getAIToolPageJsonLd(slug)
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingToolVisitTracker path="/trade-analyzer" toolName="Trade Analyzer" />
      <EngagementEventTracker
        eventType="trade_analyzer"
        oncePerDayKey="tool_trade_analyzer"
        meta={{ product: "legacy" }}
      />
      <AIToolSeoLanding config={config} />
    </>
  )
}

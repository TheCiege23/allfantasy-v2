import type { Metadata } from 'next'
import AIToolSeoLanding from '@/components/seo/AIToolSeoLanding'
import { LandingToolVisitTracker } from '@/components/landing/LandingToolVisitTracker'
import { AI_TOOL_PAGES, getAIToolPageCanonical } from '@/lib/seo-landing/ai-tool-pages'
import { buildSeoMeta } from '@/lib/seo'

const config = AI_TOOL_PAGES['trade-analyzer']

export const metadata: Metadata = buildSeoMeta({
  title: config.title,
  description: config.description,
  canonical: getAIToolPageCanonical('trade-analyzer'),
})

export default function TradeAnalyzerPage() {
  return (
    <>
      <LandingToolVisitTracker path="/trade-analyzer" toolName="Trade Analyzer" />
      <AIToolSeoLanding config={config} />
    </>
  )
}

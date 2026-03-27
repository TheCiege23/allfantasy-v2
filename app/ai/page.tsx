import type { Metadata } from 'next'
import AIHubPage from '@/components/ai-hub/AIHubPage'
import { buildSeoMeta } from '@/lib/seo'
import { getWebPageSchema } from '@/lib/seo'
import { PageJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = buildSeoMeta({
  title: 'AllFantasy AI Hub – Tools, Chimmy, and Saved Analyses',
  description:
    'Access all AllFantasy AI tools in one premium hub: Trade Analyzer, Waiver AI, Draft Helper, Matchup AI, Rankings AI, Story Creator, Fantasy Coach, Content Generator, and Chimmy.',
  canonicalPath: '/ai',
  openGraphTitle: 'AllFantasy AI Hub',
  openGraphDescription:
    'Unified AI hub for fantasy sports tools, quick actions, provider/mode controls, and saved analysis history.',
  twitterTitle: 'AllFantasy AI Hub',
  twitterDescription: 'One place for Chimmy, AI tools, and saved analysis history.',
})

const AI_PAGE_SCHEMA = getWebPageSchema({
  name: 'AllFantasy AI Hub',
  description: 'Unified AI hub for AllFantasy tools, quick actions, Chimmy, and saved analysis history.',
  url: '/ai',
})

export default function AIPage() {
  return (
    <>
      <PageJsonLd schemas={[AI_PAGE_SCHEMA]} />
      <AIHubPage />
    </>
  )
}

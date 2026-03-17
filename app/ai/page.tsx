import type { Metadata } from 'next'
import AISystemExplainerPage from '@/components/ai-hub/AISystemExplainerPage'
import { buildSeoMeta } from '@/lib/seo'
import { getWebPageSchema } from '@/lib/seo'
import { PageJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = buildSeoMeta({
  title: 'How AllFantasy AI Works – Chimmy, Deterministic AI & Providers | AllFantasy',
  description:
    'Learn how the AllFantasy AI system works: Chimmy assistant, deterministic-first context, and OpenAI, DeepSeek, and xAI (Grok) providers. Reliable numbers, then clear explanations.',
  canonicalPath: '/ai',
  openGraphTitle: 'How AllFantasy AI Works | AllFantasy',
  openGraphDescription:
    'Chimmy overview, deterministic AI, and OpenAI / DeepSeek / xAI roles. One place to understand the AllFantasy AI system.',
  twitterTitle: 'How AllFantasy AI Works | AllFantasy',
  twitterDescription: 'Chimmy, deterministic-first AI, and multi-provider orchestration.',
})

const AI_PAGE_SCHEMA = getWebPageSchema({
  name: 'How AllFantasy AI Works',
  description: 'Chimmy overview, deterministic-first AI, and OpenAI / DeepSeek / xAI (Grok) roles.',
  url: '/ai',
})

export default function AIPage() {
  return (
    <>
      <PageJsonLd schemas={[AI_PAGE_SCHEMA]} />
      <AISystemExplainerPage />
    </>
  )
}

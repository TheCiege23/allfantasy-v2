import type { Metadata } from 'next'
import AISystemExplainerPage from '@/components/ai-hub/AISystemExplainerPage'
import { buildSeoMeta } from '@/lib/seo'
import { getWebPageSchema } from '@/lib/seo'
import { PageJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = buildSeoMeta({
  title: 'How AllFantasy AI Works – Chimmy, Deterministic AI & Providers | AllFantasy',
  description:
    'Learn how the AllFantasy AI system works: Chimmy assistant, deterministic-first context, OpenAI/DeepSeek/xAI (Grok), and OpenClaw assistant routing. Reliable numbers, then clear explanations.',
  canonicalPath: '/ai',
  openGraphTitle: 'How AllFantasy AI Works | AllFantasy',
  openGraphDescription:
    'Chimmy overview, deterministic AI, OpenAI / DeepSeek / xAI roles, and OpenClaw assistant routing.',
  twitterTitle: 'How AllFantasy AI Works | AllFantasy',
  twitterDescription: 'Chimmy, deterministic-first AI, OpenAI/DeepSeek/Grok, and OpenClaw routing.',
})

const AI_PAGE_SCHEMA = getWebPageSchema({
  name: 'How AllFantasy AI Works',
  description: 'Chimmy overview, deterministic-first AI, OpenAI / DeepSeek / xAI (Grok), and OpenClaw assistant routing.',
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

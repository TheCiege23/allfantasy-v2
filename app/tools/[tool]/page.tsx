import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  TOOL_SLUGS,
  TOOL_CONFIG,
  getToolCanonical,
  type ToolSlug,
} from '@/lib/seo-landing/config'
import { ToolPageJsonLd } from '@/components/seo/JsonLd'
import ToolLandingClient from './ToolLandingClient'

export async function generateStaticParams() {
  return TOOL_SLUGS.map((tool) => ({ tool }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>
}): Promise<Metadata> {
  const { tool } = await params
  const config = TOOL_CONFIG[tool as ToolSlug]
  if (!config) return { title: 'AllFantasy – Fantasy Sports Tools' }

  const canonical = getToolCanonical(config.slug)
  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    alternates: { canonical },
    openGraph: {
      title: config.title,
      description: config.description,
      url: canonical,
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
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ tool: string }>
}) {
  const { tool } = await params
  if (!TOOL_SLUGS.includes(tool as ToolSlug)) notFound()
  const config = TOOL_CONFIG[tool as ToolSlug]
  return (
    <>
      <ToolPageJsonLd config={config} />
      <ToolLandingClient config={config} />
    </>
  )
}

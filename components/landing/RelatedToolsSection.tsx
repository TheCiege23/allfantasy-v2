'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { ToolSlug } from '@/lib/seo-landing/config'
import { TOOL_CONFIG } from '@/lib/seo-landing/config'

interface RelatedToolsSectionProps {
  slugs: ToolSlug[]
  title?: string
}

export function RelatedToolsSection({ slugs, title = 'Related tools' }: RelatedToolsSectionProps) {
  const tools = slugs
    .slice(0, 6)
    .map((slug) => TOOL_CONFIG[slug])
    .filter(Boolean)

  if (tools.length === 0) return null

  return (
    <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}>
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
        {title}
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {tools.map((tool) => (
          <li key={tool.slug}>
            <Link
              href={`/tools/${tool.slug}`}
              className="flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm hover:opacity-90"
              style={{
                borderColor: 'var(--border)',
                background: 'color-mix(in srgb, var(--panel2) 60%, transparent)',
                color: 'var(--text)',
              }}
            >
              <span className="font-medium">{tool.headline}</span>
              <ArrowRight className="h-4 w-4 shrink-0" style={{ color: 'var(--muted)' }} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

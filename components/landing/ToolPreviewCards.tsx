'use client'

import Link from 'next/link'
import { BarChart3, ClipboardList, Target, ArrowRight } from 'lucide-react'
import { trackLandingCtaClick } from '@/lib/landing-analytics'

/**
 * Tool preview cards for the landing page.
 * Each card: tool name, description, example preview. Clicks open the tool page.
 * PROMPT 164 — Mandatory: verify tool cards open tool pages (/trade-analyzer, /waiver-ai, /mock-draft).
 */
const TOOL_PREVIEWS = [
  {
    title: 'Trade Analyzer',
    description: 'Get AI fairness scores, lineup impact, and counter-offer suggestions for any trade. Redraft and dynasty.',
    href: '/trade-analyzer',
    icon: BarChart3,
    examplePreview: 'Fairness 87/100 · Slight edge to Team A · Accept recommended',
  },
  {
    title: 'Waiver AI',
    description: 'Prioritize pickups with AI-powered waiver analysis tuned to your league settings and roster needs.',
    href: '/waiver-ai',
    icon: ClipboardList,
    examplePreview: 'Top add: R. Johnson · Fits your flex · 12-team PPR',
  },
  {
    title: 'Draft Helper',
    description: 'Mock drafts, real-time rankings, and AI pick suggestions. Snake and auction for NFL, NBA, MLB, and more.',
    href: '/mock-draft',
    icon: Target,
    examplePreview: 'Round 5 · Best available: RB, WR · AI suggests: J. Williams',
  },
] as const

export default function ToolPreviewCards() {
  return (
    <section
      className="border-t px-4 py-12 sm:px-6 sm:py-16"
      style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 20%, transparent)' }}
    >
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-lg font-semibold sm:text-xl" style={{ color: 'var(--text)' }}>
          Example tool previews
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm" style={{ color: 'var(--muted)' }}>
          Trade Analyzer, Waiver AI, and Draft Helper — try them from the links below.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOL_PREVIEWS.map((tool) => {
            const Icon = tool.icon
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex flex-col rounded-2xl border p-5 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
                style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
                onClick={() => trackLandingCtaClick({ cta_label: tool.title, cta_destination: tool.href, cta_type: 'tool_card', source: 'landing' })}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                    style={{ borderColor: 'var(--border)', background: 'var(--panel2)' }}
                  >
                    <Icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>
                    {tool.title}
                  </span>
                </div>
                <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                  {tool.description}
                </p>
                <div
                  className="mt-3 rounded-xl border px-3 py-2 text-xs font-mono"
                  style={{ borderColor: 'var(--border)', background: 'var(--panel2)', color: 'var(--muted)' }}
                >
                  {tool.examplePreview}
                </div>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 group-hover:underline">
                  Open tool
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

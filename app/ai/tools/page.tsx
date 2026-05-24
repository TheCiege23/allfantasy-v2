'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronLeft, BarChart3, ClipboardList, Target, Trophy, FileText, MessageCircle, Share2 } from 'lucide-react'
import { AIToolCard, AIQuickActionBar, UnifiedAIWorkbench } from '@/components/ai-hub'
import { AIProductLayer } from '@/lib/ai-product-layer'

const AI_TOOL_CARDS = [
  { id: 'trade', title: 'Trade Analyzer', description: 'Context-aware trade evaluations', href: AIProductLayer.routes.getHrefForFeature('trade_analyzer', { source: 'ai_hub' }), icon: BarChart3, accent: 'from-red-500/20 to-orange-500/10 border-red-500/20', group: 'lineup' },
  { id: 'waiver', title: 'Waiver AI', description: 'One-move waiver recommendations', href: AIProductLayer.routes.getHrefForFeature('waiver_ai', { source: 'ai_hub' }), icon: ClipboardList, accent: 'from-purple-500/20 to-violet-500/10 border-purple-500/20', group: 'lineup' },
  { id: 'matchup', title: 'Matchup AI', description: 'Matchup analysis and advice', href: AIProductLayer.chimmy.getChatHrefWithPrompt('Explain my matchup', { source: 'ai_hub', insightType: 'matchup' }), icon: BarChart3, accent: 'from-amber-500/20 to-orange-500/10 border-amber-500/20', group: 'lineup' },
  { id: 'draft', title: 'Draft Helper', description: 'Real-time draft and pick advice', href: AIProductLayer.routes.getHrefForFeature('draft_helper', { source: 'ai_hub' }), icon: Target, accent: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/20', group: 'draft' },
  { id: 'rankings', title: 'Rankings AI', description: 'Power rankings and explanations', href: AIProductLayer.routes.getHrefForFeature('rankings', { source: 'ai_hub' }), icon: Trophy, accent: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/20', group: 'draft' },
  { id: 'coach', title: 'Fantasy Coach', description: 'Ask Chimmy for strategy', href: AIProductLayer.chimmy.getChatHref({ source: 'ai_hub' }), icon: MessageCircle, accent: 'from-violet-500/20 to-purple-500/10 border-violet-500/20', group: 'community' },
  { id: 'story', title: 'Story Creator', description: 'Narratives and Hall of Fame', href: AIProductLayer.routes.getHrefForFeature('story_creator', { source: 'ai_hub' }), icon: FileText, accent: 'from-amber-500/20 to-yellow-500/10 border-amber-500/20', group: 'community' },
  { id: 'content', title: 'Content Generator', description: 'Social clips and share copy', href: AIProductLayer.routes.getHrefForFeature('content', { source: 'ai_hub' }), icon: Share2, accent: 'from-pink-500/20 to-rose-500/10 border-pink-500/20', group: 'community' },
]

const TOOL_GROUPS = [
  { key: 'lineup', label: 'Lineup & matchup', ids: ['trade', 'waiver', 'matchup'] },
  { key: 'draft', label: 'Draft & rankings', ids: ['draft', 'rankings'] },
  { key: 'community', label: 'Coach & community', ids: ['coach', 'story', 'content'] },
]

export default function AIToolsPage() {
  return (
    <div className="mode-surface min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/ai"
          data-testid="ai-tools-back-link"
          className="mb-4 inline-flex touch-manipulation items-center gap-2 py-1 text-sm text-white/60 hover:text-white/90 sm:mb-6"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          Back to AI
        </Link>
        <h1 className="mb-1 text-xl font-black tracking-tight text-white sm:text-2xl">AI Tools</h1>
        <p className="mb-4 text-sm text-white/50 sm:mb-6">Specialized tools for every stage of the fantasy season.</p>
        <div className="mb-6">
          <AIQuickActionBar />
        </div>
        <div className="mb-4">
          <Link
            href="/ai/saved"
            data-testid="ai-tools-open-history-link"
            className="inline-flex min-h-[44px] touch-manipulation items-center rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10 sm:min-h-0"
          >
            Open saved recommendations
          </Link>
        </div>
        <UnifiedAIWorkbench />

        <div className="mt-8 space-y-6">
          {TOOL_GROUPS.map((group) => {
            const cards = AI_TOOL_CARDS.filter((c) => group.ids.includes(c.id))
            return (
              <div key={group.key}>
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{group.label}</p>
                  <span className="h-px flex-1 bg-white/[0.06]" />
                </div>
                <div className="grid grid-cols-1 gap-2.5 min-[400px]:grid-cols-2 lg:grid-cols-3">
                  {cards.map((card) => (
                    <AIToolCard
                      key={card.id}
                      id={card.id}
                      title={card.title}
                      description={card.description}
                      href={card.href}
                      icon={card.icon}
                      accent={card.accent}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

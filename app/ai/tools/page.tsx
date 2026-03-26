'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronLeft, BarChart3, ClipboardList, Target, Trophy, FileText, MessageCircle, Share2 } from 'lucide-react'
import { AIToolCard, UnifiedAIWorkbench } from '@/components/ai-hub'
import { AIProductLayer } from '@/lib/ai-product-layer'

const AI_TOOL_CARDS = [
  { id: 'trade', title: 'Trade Analyzer', description: 'Context-aware trade evaluations', href: AIProductLayer.routes.getHrefForFeature('trade_analyzer', { source: 'ai_hub' }), icon: BarChart3, accent: 'from-red-500/20 to-orange-500/10 border-red-500/20' },
  { id: 'waiver', title: 'Waiver AI', description: 'One-move waiver recommendations', href: AIProductLayer.routes.getHrefForFeature('waiver_ai', { source: 'ai_hub' }), icon: ClipboardList, accent: 'from-purple-500/20 to-violet-500/10 border-purple-500/20' },
  { id: 'draft', title: 'Draft Helper', description: 'Real-time draft and pick advice', href: AIProductLayer.routes.getHrefForFeature('draft_helper', { source: 'ai_hub' }), icon: Target, accent: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/20' },
  { id: 'matchup', title: 'Matchup AI', description: 'Matchup analysis and advice', href: AIProductLayer.chimmy.getChatHrefWithPrompt('Explain my matchup', { source: 'ai_hub', insightType: 'matchup' }), icon: BarChart3, accent: 'from-amber-500/20 to-orange-500/10 border-amber-500/20' },
  { id: 'rankings', title: 'Rankings AI', description: 'Power rankings and explanations', href: AIProductLayer.routes.getHrefForFeature('rankings', { source: 'ai_hub' }), icon: Trophy, accent: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/20' },
  { id: 'story', title: 'Story Creator', description: 'Narratives and Hall of Fame', href: AIProductLayer.routes.getHrefForFeature('story_creator', { source: 'ai_hub' }), icon: FileText, accent: 'from-amber-500/20 to-yellow-500/10 border-amber-500/20' },
  { id: 'coach', title: 'Fantasy Coach', description: 'Ask Chimmy for strategy', href: AIProductLayer.chimmy.getChatHref({ source: 'ai_hub' }), icon: MessageCircle, accent: 'from-violet-500/20 to-purple-500/10 border-violet-500/20' },
  { id: 'content', title: 'Content Generator', description: 'Social clips and share copy', href: AIProductLayer.routes.getHrefForFeature('content', { source: 'ai_hub' }), icon: Share2, accent: 'from-pink-500/20 to-rose-500/10 border-pink-500/20' },
]

export default function AIToolsPage() {
  return (
    <div className="mode-surface min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/ai"
          data-testid="ai-tools-back-link"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white/90"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to AI
        </Link>
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-white">AI Tools</h1>
        <UnifiedAIWorkbench />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AI_TOOL_CARDS.map((card) => (
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
    </div>
  )
}

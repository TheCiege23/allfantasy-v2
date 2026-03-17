'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronLeft, BarChart3, ClipboardList, Target, Trophy, FileText, MessageCircle, Share2 } from 'lucide-react'
import { AIToolCard } from '@/components/ai-hub'
import { getChimmyChatHrefWithPrompt } from '@/lib/ai-product-layer/UnifiedChimmyEntryResolver'

const AI_TOOL_CARDS = [
  { id: 'trade', title: 'Trade Analyzer', description: 'Context-aware trade evaluations', href: '/af-legacy?tab=trade', icon: BarChart3, accent: 'from-red-500/20 to-orange-500/10 border-red-500/20' },
  { id: 'waiver', title: 'Waiver AI', description: 'One-move waiver recommendations', href: '/af-legacy?tab=waiver', icon: ClipboardList, accent: 'from-purple-500/20 to-violet-500/10 border-purple-500/20' },
  { id: 'draft', title: 'Draft Helper', description: 'Real-time draft and pick advice', href: '/af-legacy?tab=mock-draft', icon: Target, accent: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/20' },
  { id: 'matchup', title: 'Matchup AI', description: 'Matchup analysis and advice', href: getChimmyChatHrefWithPrompt('Explain my matchup'), icon: BarChart3, accent: 'from-amber-500/20 to-orange-500/10 border-amber-500/20' },
  { id: 'rankings', title: 'Rankings AI', description: 'Power rankings and explanations', href: '/af-legacy?tab=rankings', icon: Trophy, accent: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/20' },
  { id: 'story', title: 'Story Creator', description: 'Narratives and Hall of Fame', href: '/af-legacy?tab=overview', icon: FileText, accent: 'from-amber-500/20 to-yellow-500/10 border-amber-500/20' },
  { id: 'coach', title: 'Fantasy Coach', description: 'Ask Chimmy for strategy', href: '/af-legacy?tab=chat', icon: MessageCircle, accent: 'from-violet-500/20 to-purple-500/10 border-violet-500/20' },
  { id: 'content', title: 'Content Generator', description: 'Social clips and share copy', href: '/social-clips', icon: Share2, accent: 'from-pink-500/20 to-rose-500/10 border-pink-500/20' },
]

export default function AIToolsPage() {
  return (
    <div className="mode-surface min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/ai"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white/90"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to AI
        </Link>
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-white">AI Tools</h1>
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

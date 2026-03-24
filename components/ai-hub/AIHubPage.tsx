'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, MessageCircle, BarChart3, ClipboardList, Target, Trophy, FileText, Bot, LayoutGrid, ChevronRight, Share2 } from 'lucide-react'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { getChimmyChatHref, getChimmyChatHrefWithPrompt } from '@/lib/ai-product-layer/UnifiedChimmyEntryResolver'
import AIToolCard from './AIToolCard'
import AIQuickActionBar from './AIQuickActionBar'

/** Display labels for sports (Prisma uses NCAAF, NCAAB, SOCCER). */
const SPORT_LABELS: Record<string, string> = {
  NFL: 'NFL',
  NHL: 'NHL',
  NBA: 'NBA',
  MLB: 'MLB',
  NCAAF: 'NCAA Football',
  NCAAB: 'NCAA Basketball',
  SOCCER: 'Soccer',
}

const AI_TOOL_CARDS = [
  { id: 'trade', title: 'Trade Analyzer', description: 'Context-aware trade evaluations', href: '/af-legacy?tab=trade', icon: BarChart3, accent: 'from-red-500/20 to-orange-500/10 border-red-500/20' },
  { id: 'waiver', title: 'Waiver AI', description: 'One-move waiver recommendations', href: '/af-legacy?tab=waiver', icon: ClipboardList, accent: 'from-purple-500/20 to-violet-500/10 border-purple-500/20' },
  { id: 'draft', title: 'Draft Helper', description: 'Real-time draft and pick advice', href: '/af-legacy?tab=mock-draft', icon: Target, accent: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/20' },
  { id: 'matchup', title: 'Matchup AI', description: 'Matchup analysis and advice', href: getChimmyChatHrefWithPrompt('Explain my matchup'), icon: BarChart3, accent: 'from-amber-500/20 to-orange-500/10 border-amber-500/20' },
  { id: 'rankings', title: 'Rankings AI', description: 'Power rankings and explanations', href: '/af-legacy?tab=rankings', icon: Trophy, accent: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/20' },
  { id: 'story', title: 'Story Creator', description: 'Narratives and Hall of Fame', href: '/af-legacy?tab=overview', icon: FileText, accent: 'from-amber-500/20 to-yellow-500/10 border-amber-500/20' },
  { id: 'coach', title: 'Fantasy Coach', description: 'Ask Chimmy for strategy', href: getChimmyChatHref(), icon: MessageCircle, accent: 'from-violet-500/20 to-purple-500/10 border-violet-500/20' },
  { id: 'content', title: 'Content Generator', description: 'Social clips and share copy', href: '/social-clips', icon: Share2, accent: 'from-pink-500/20 to-rose-500/10 border-pink-500/20' },
]

export default function AIHubPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse rounded-xl bg-white/5 h-12 w-48" />
      </div>
    )
  }

  return (
    <div className="mode-surface min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
              <Sparkles className="h-6 w-6 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">AI Hub</h1>
              <p className="mt-0.5 text-sm text-white/60">One place for all AI-powered tools. Deterministic-first, calm, and trustworthy.</p>
            </div>
          </div>
        </header>

        <section className="mb-6">
          <AIQuickActionBar />
        </section>

        <section className="mb-8">
          <Link
            href={getChimmyChatHref()}
            className="flex items-center justify-between rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 transition hover:bg-purple-500/15 hover:border-purple-500/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                <Bot className="h-5 w-5 text-purple-300" />
              </div>
              <div>
                <span className="font-semibold text-white">Chat with Chimmy</span>
                <p className="text-xs text-white/60">Ask about trades, waivers, drafts, and matchups</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-white/50" aria-hidden />
          </Link>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">AI Tools</h2>
            <Link href="/ai/tools" className="text-xs text-white/50 hover:text-white/70">
              View all tools
            </Link>
          </div>
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
        </section>

        <section className="mb-8 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="mb-2 text-sm font-semibold text-white/80">History</h2>
          <p className="text-sm text-white/50">Open saved results from any AI tool.</p>
          <Link
            href="/ai/history"
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white/90"
          >
            <LayoutGrid className="h-4 w-4" />
            Open saved
          </Link>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="mb-2 text-sm font-semibold text-white/80">Supported sports</h2>
          <p className="text-sm text-white/50">NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUPPORTED_SPORTS.map((s) => (
              <span key={s} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60">
                {SPORT_LABELS[s] ?? s}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

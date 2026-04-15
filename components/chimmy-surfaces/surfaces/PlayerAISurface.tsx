'use client'

import React, { useState } from 'react'
import { useAISurface } from '../AISurfaceContext'
import ChimmySurfaceShell from '../ChimmySurfaceShell'
import ChimmyInsightCard from '../ChimmyInsightCard'
import ChimmyConfidenceBadge from '../ChimmyConfidenceBadge'
import ChimmyRiskBadge from '../ChimmyRiskBadge'
import ChimmyExpandedExplanation from '../ChimmyExpandedExplanation'
import ChimmyThinkingState from '../ChimmyThinkingState'
import ChimmyEmptyState from '../ChimmyEmptyState'
import ChimmyModalDeepDive from '../ChimmyModalDeepDive'
import ChimmyLauncherButton from '../ChimmyLauncherButton'
import type { ChimmyRiskLevel } from '../ChimmyRiskBadge'
import ChimmySurfaceActionFeed from '../ChimmySurfaceActionFeed'
import type { ChimmyFeedRecommendation, AIActionContext } from '@/lib/chimmy-actions'
import { buildActionContext } from '@/lib/chimmy-actions'

export interface PlayerAISurfaceProps {
  playerName?: string
  position?: string
  verdict?: 'hold' | 'buy' | 'sell' | 'start' | 'sit'
  verdictRationale?: string
  confidencePct?: number
  riskLevel?: ChimmyRiskLevel
  insights?: Array<{ id: string; title: string; summary: string; tag?: string }>
  isLoading?: boolean
  onOpenChat?: () => void
  className?: string
  actionFeed?: ChimmyFeedRecommendation[]
  actionContext?: AIActionContext
}

const VERDICT_STYLES: Record<string, string> = {
  hold:  'bg-blue-500/20 text-blue-300',
  buy:   'bg-emerald-500/20 text-emerald-300',
  sell:  'bg-red-500/20 text-red-300',
  start: 'bg-indigo-500/20 text-indigo-300',
  sit:   'bg-amber-500/20 text-amber-300',
}

export default function PlayerAISurface({
  playerName,
  position,
  verdict,
  verdictRationale,
  confidencePct,
  riskLevel,
  insights = [],
  isLoading = false,
  onOpenChat,
  className = '',
  actionFeed,
  actionContext,
}: PlayerAISurfaceProps) {
  const surface = useAISurface()
  const resolvedActionContext = actionContext ?? buildActionContext(surface)
  const [deepOpen, setDeepOpen] = useState(false)

  return (
    <ChimmySurfaceShell className={className}>
      {actionFeed && actionFeed.length > 0 && (
        <ChimmySurfaceActionFeed recommendations={actionFeed} context={resolvedActionContext} className="mb-4" />
      )}
      <div className="flex items-center justify-between mb-3">
        <div>
          {playerName && <p className="text-sm font-semibold text-white">{playerName}</p>}
          {position && <p className="text-xs text-white/40">{position}</p>}
        </div>
        <div className="flex items-center gap-2">
          {riskLevel && <ChimmyRiskBadge level={riskLevel} />}
          {onOpenChat && <ChimmyLauncherButton label="Player AI" onClick={onOpenChat} />}
        </div>
      </div>

      {isLoading && <ChimmyThinkingState message="Analyzing player data…" />}

      {!isLoading && verdict && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wide ${VERDICT_STYLES[verdict] ?? 'bg-white/10 text-white'}`}>
              {verdict}
            </span>
            {confidencePct !== undefined && <ChimmyConfidenceBadge pct={confidencePct} />}
          </div>
          {verdictRationale && (
            <p className="mt-2 text-sm text-white/65 leading-relaxed">{verdictRationale}</p>
          )}
        </div>
      )}

      {!isLoading && insights.map((ins) => (
        <ChimmyInsightCard key={ins.id} title={ins.title} summary={ins.summary} tag={ins.tag} className="mb-2" onExpand={() => setDeepOpen(true)} />
      ))}

      {!isLoading && !verdict && insights.length === 0 && (
        <ChimmyEmptyState
          title="Player analysis"
          message="Chimmy will give you a hold/buy/sell verdict with data-backed rationale."
          prompts={onOpenChat ? [{ label: 'Analyze this player', onClick: onOpenChat }] : undefined}
        />
      )}

      <ChimmyModalDeepDive open={deepOpen} onClose={() => setDeepOpen(false)} title={playerName ?? 'Player Analysis'} subtitle={position}>
        <div className="space-y-4">
          {verdictRationale && (
            <ChimmyExpandedExplanation summary={`Verdict: ${verdict?.toUpperCase()}`} details={verdictRationale} defaultExpanded />
          )}
          {insights.map((ins) => (
            <ChimmyInsightCard key={ins.id} title={ins.title} summary={ins.summary} tag={ins.tag} />
          ))}
        </div>
      </ChimmyModalDeepDive>
    </ChimmySurfaceShell>
  )
}

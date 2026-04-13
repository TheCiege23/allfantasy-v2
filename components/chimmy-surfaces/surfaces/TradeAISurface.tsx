'use client'

import React, { useState } from 'react'
import { useAISurface } from '../AISurfaceContext'
import ChimmySurfaceShell from '../ChimmySurfaceShell'
import ChimmyCompareCard, { type ChimmyCompareItem } from '../ChimmyCompareCard'
import ChimmyInsightCard from '../ChimmyInsightCard'
import ChimmyThinkingState from '../ChimmyThinkingState'
import ChimmyEmptyState from '../ChimmyEmptyState'
import ChimmyErrorState from '../ChimmyErrorState'
import ChimmyModalDeepDive from '../ChimmyModalDeepDive'
import ChimmyExpandedExplanation from '../ChimmyExpandedExplanation'
import ChimmyLauncherButton from '../ChimmyLauncherButton'
import ChimmyRiskBadge from '../ChimmyRiskBadge'
import type { ChimmyRiskLevel } from '../ChimmyRiskBadge'
import ChimmySurfaceActionFeed from '../ChimmySurfaceActionFeed'
import type { ChimmyFeedRecommendation, AIActionContext } from '@/lib/chimmy-actions'
import { buildActionContext } from '@/lib/chimmy-actions'

export interface TradeAISurfaceProps {
  /** Two sides of the trade for comparison */
  tradeCompare?: { sideA: ChimmyCompareItem; sideB: ChimmyCompareItem; summary?: string }
  fairnessLabel?: string
  fairnessSummary?: string
  riskLevel?: ChimmyRiskLevel
  insights?: Array<{ id: string; title: string; summary: string; tag?: string }>
  counterSuggestion?: string
  isLoading?: boolean
  error?: string
  onRetry?: () => void
  onOpenChat?: () => void
  className?: string
  actionFeed?: ChimmyFeedRecommendation[]
  actionContext?: AIActionContext
}

export default function TradeAISurface({
  tradeCompare,
  fairnessLabel,
  fairnessSummary,
  riskLevel,
  insights = [],
  counterSuggestion,
  isLoading = false,
  error,
  onRetry,
  onOpenChat,
  className = '',
  actionFeed,
  actionContext,
}: TradeAISurfaceProps) {
  const surface = useAISurface()
  const resolvedActionContext = actionContext ?? buildActionContext(surface)
  const [deepOpen, setDeepOpen] = useState(false)

  return (
    <ChimmySurfaceShell className={className}>
      {actionFeed && actionFeed.length > 0 && (
        <ChimmySurfaceActionFeed recommendations={actionFeed} context={resolvedActionContext} className="mb-4" />
      )}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Trade AI</h3>
        <div className="flex items-center gap-2">
          {riskLevel && <ChimmyRiskBadge level={riskLevel} />}
          <ChimmyLauncherButton label="Analyze Trade" onClick={() => setDeepOpen(true)} />
        </div>
      </div>

      {isLoading && <ChimmyThinkingState message="Evaluating trade fairness…" />}
      {error && !isLoading && <ChimmyErrorState message={error} onRetry={onRetry} />}

      {!isLoading && !error && (
        <div className="space-y-3">
          {tradeCompare && (
            <ChimmyCompareCard
              title="Trade Comparison"
              items={[tradeCompare.sideA, tradeCompare.sideB]}
              summary={tradeCompare.summary}
            />
          )}

          {fairnessSummary && (
            <ChimmyExpandedExplanation
              summary={fairnessLabel ?? 'Trade Fairness'}
              details={fairnessSummary}
            />
          )}

          {counterSuggestion && (
            <ChimmyInsightCard
              title="Counter Suggestion"
              summary={counterSuggestion}
              tag="Counter"
              severity="info"
              onExpand={() => setDeepOpen(true)}
            />
          )}

          {insights.map((ins) => (
            <ChimmyInsightCard key={ins.id} title={ins.title} summary={ins.summary} tag={ins.tag} />
          ))}

          {!tradeCompare && insights.length === 0 && (
            <ChimmyEmptyState
              title="Trade analyzer"
              message="Select players to trade and Chimmy will assess fairness, equity, and strategy."
              prompts={onOpenChat ? [{ label: 'Analyze a trade', onClick: onOpenChat }] : undefined}
            />
          )}
        </div>
      )}

      <ChimmyModalDeepDive open={deepOpen} onClose={() => setDeepOpen(false)} title="Trade Deep Dive">
        <div className="space-y-4">
          {fairnessSummary && (
            <ChimmyExpandedExplanation summary={fairnessLabel ?? 'Fairness Analysis'} details={fairnessSummary} defaultExpanded />
          )}
          {insights.map((ins) => (
            <ChimmyInsightCard key={ins.id} title={ins.title} summary={ins.summary} tag={ins.tag} />
          ))}
        </div>
      </ChimmyModalDeepDive>
    </ChimmySurfaceShell>
  )
}

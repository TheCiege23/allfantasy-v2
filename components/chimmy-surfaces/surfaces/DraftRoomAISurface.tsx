'use client'

import React, { useState } from 'react'
import { useAISurface } from '../AISurfaceContext'
import ChimmySurfaceShell from '../ChimmySurfaceShell'
import ChimmyInsightCard from '../ChimmyInsightCard'
import ChimmyRecommendationCard from '../ChimmyRecommendationCard'
import ChimmyCompareCard from '../ChimmyCompareCard'
import ChimmyThinkingState from '../ChimmyThinkingState'
import ChimmyEmptyState from '../ChimmyEmptyState'
import ChimmyAlertBanner from '../ChimmyAlertBanner'
import ChimmyDrawer from '../ChimmyDrawer'
import ChimmyLauncherButton from '../ChimmyLauncherButton'
import ChimmyPremiumGate from '../ChimmyPremiumGate'
import ChimmySurfaceActionFeed from '../ChimmySurfaceActionFeed'
import ChimmyUnifiedAlertFeed from '../ChimmyUnifiedAlertFeed'
import type { ChimmyFeedRecommendation, AIActionContext } from '@/lib/chimmy-actions'
import { buildActionContext } from '@/lib/chimmy-actions'

export interface DraftRoomAISurfacePickRec {
  pickId: string
  playerLabelA: string
  playerValueA: string
  playerLabelB: string
  playerValueB: string
  recommendedId: string
  summary?: string
}

export interface DraftRoomAISurfaceProps {
  currentPick?: number
  totalPicks?: number
  pickRecommendation?: DraftRoomAISurfacePickRec
  insights?: Array<{ id: string; title: string; summary: string; tag?: string }>
  timerAlert?: string
  isLoading?: boolean
  error?: string
  onRetry?: () => void
  onOpenChat?: () => void
  className?: string
  actionFeed?: ChimmyFeedRecommendation[]
  actionContext?: AIActionContext
}

export default function DraftRoomAISurface({
  currentPick,
  totalPicks,
  pickRecommendation,
  insights = [],
  timerAlert,
  isLoading = false,
  error,
  onRetry,
  onOpenChat,
  className = '',
  actionFeed,
  actionContext,
}: DraftRoomAISurfaceProps) {
  const surface = useAISurface()
  const resolvedActionContext = actionContext ?? buildActionContext(surface)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <ChimmySurfaceShell className={className}>
      <ChimmyUnifiedAlertFeed
        leagueId={surface.leagueState?.leagueId ?? undefined}
        surface="draft_room"
        presentation="critical_drawer"
      />
      <ChimmyUnifiedAlertFeed
        leagueId={surface.leagueState?.leagueId ?? undefined}
        surface="draft_room"
        presentation="floating_nudge"
      />

      {actionFeed && actionFeed.length > 0 && (
        <ChimmySurfaceActionFeed recommendations={actionFeed} context={resolvedActionContext} className="mb-4" />
      )}
      {timerAlert && (
        <ChimmyAlertBanner variant="warning" message={timerAlert} className="mb-3" />
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-white/50">
          {currentPick !== undefined && totalPicks !== undefined
            ? `Pick ${currentPick} of ${totalPicks}`
            : 'Draft Room AI'}
        </div>
        <ChimmyLauncherButton label="Draft Help" onClick={() => setDrawerOpen(true)} />
      </div>

      {isLoading && <ChimmyThinkingState message="Analyzing available players…" />}
      {error && !isLoading && <p className="text-sm text-red-400">{error}</p>}

      {!isLoading && !error && pickRecommendation && (
        <ChimmyPremiumGate
          requiredTier="premium"
          featureLabel="AI Pick Recommendations"
          featureDescription="Side-by-side player comparison with Chimmy's recommendation."
          onUpgrade={onOpenChat}
        >
          <ChimmyCompareCard
            title="Pick Recommendation"
            items={[
              { id: pickRecommendation.pickId + '-a', label: pickRecommendation.playerLabelA, primaryValue: pickRecommendation.playerValueA, isRecommended: pickRecommendation.recommendedId === pickRecommendation.pickId + '-a' },
              { id: pickRecommendation.pickId + '-b', label: pickRecommendation.playerLabelB, primaryValue: pickRecommendation.playerValueB, isRecommended: pickRecommendation.recommendedId === pickRecommendation.pickId + '-b' },
            ]}
            summary={pickRecommendation.summary}
          />
        </ChimmyPremiumGate>
      )}

      {!isLoading && !error && insights.map((ins) => (
        <ChimmyInsightCard
          key={ins.id}
          title={ins.title}
          summary={ins.summary}
          tag={ins.tag}
          className="mt-2"
          onExpand={() => setDrawerOpen(true)}
        />
      ))}

      {!isLoading && !error && !pickRecommendation && insights.length === 0 && (
        <ChimmyEmptyState
          title="Draft AI ready"
          message="Ask Chimmy about any player or get pick recommendations."
          prompts={onOpenChat ? [{ label: 'Who should I draft?', onClick: onOpenChat }] : undefined}
        />
      )}

      <ChimmyDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Draft AI">
        <ChimmyEmptyState
          title="Ask Chimmy"
          message="Get pick recommendations, ADP insights, and positional value analysis."
          prompts={onOpenChat ? [
            { label: 'Best value at this pick?', onClick: () => { setDrawerOpen(false); onOpenChat() } },
            { label: 'Positional scarcity?', onClick: () => { setDrawerOpen(false); onOpenChat() } },
          ] : undefined}
        />
      </ChimmyDrawer>
    </ChimmySurfaceShell>
  )
}

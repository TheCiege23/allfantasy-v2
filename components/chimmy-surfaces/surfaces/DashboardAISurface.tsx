'use client'

import React, { useState } from 'react'
import { useAISurface } from '../AISurfaceContext'
import ChimmySurfaceShell from '../ChimmySurfaceShell'
import ChimmyInsightCard from '../ChimmyInsightCard'
import ChimmyRecommendationCard from '../ChimmyRecommendationCard'
import ChimmyThinkingState from '../ChimmyThinkingState'
import ChimmyEmptyState from '../ChimmyEmptyState'
import ChimmyErrorState from '../ChimmyErrorState'
import ChimmyLauncherButton from '../ChimmyLauncherButton'
import ChimmyDrawer from '../ChimmyDrawer'
import ChimmyPremiumGate from '../ChimmyPremiumGate'
import ChimmySurfaceActionFeed from '../ChimmySurfaceActionFeed'
import ChimmyAnalyticsSummaryPanel from '../ChimmyAnalyticsSummaryPanel'
import ChimmyUnifiedAlertFeed from '../ChimmyUnifiedAlertFeed'
import type { ChimmyFeedRecommendation, AIActionContext } from '@/lib/chimmy-actions'
import { buildActionContext } from '@/lib/chimmy-actions'

export interface DashboardAISurfaceInsight {
  id: string
  title: string
  summary: string
  tag?: string
  confidencePct?: number
  severity?: 'info' | 'warning' | 'success' | 'critical'
}

export interface DashboardAISurfaceRecommendation {
  id: string
  action: string
  rationale: string
  priority?: 'high' | 'medium' | 'low'
  actionType?: string
  confidencePct?: number
  onAction?: () => void
  actionLabel?: string
}

export interface DashboardAISurfaceProps {
  insights?: DashboardAISurfaceInsight[]
  recommendations?: DashboardAISurfaceRecommendation[]
  isLoading?: boolean
  error?: string
  onRetry?: () => void
  onOpenChat?: () => void
  className?: string
  actionFeed?: ChimmyFeedRecommendation[]
  actionContext?: AIActionContext
  showLearningSummary?: boolean
}

export default function DashboardAISurface({
  insights = [],
  recommendations = [],
  isLoading = false,
  error,
  onRetry,
  onOpenChat,
  className = '',
  actionFeed,
  actionContext,
  showLearningSummary = true,
}: DashboardAISurfaceProps) {
  const surface = useAISurface()
  const { subscriptionState } = surface
  const resolvedActionContext = actionContext ?? buildActionContext(surface)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <ChimmySurfaceShell className={className}>
      <ChimmyUnifiedAlertFeed
        leagueId={surface.leagueState?.leagueId ?? undefined}
        surface="dashboard"
        className="mb-3"
      />

      {actionFeed && actionFeed.length > 0 && (
        <ChimmySurfaceActionFeed recommendations={actionFeed} context={resolvedActionContext} className="mb-4" />
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Today's AI Insights</h2>
        <ChimmyLauncherButton
          label="Ask Chimmy"
          hasNotification={insights.length > 0}
          onClick={() => setDrawerOpen(true)}
        />
      </div>

      {isLoading && <ChimmyThinkingState message="Loading your dashboard insights…" />}

      {error && !isLoading && <ChimmyErrorState message={error} onRetry={onRetry} />}

      {!isLoading && !error && insights.length === 0 && recommendations.length === 0 && (
        <ChimmyEmptyState
          title="No insights yet"
          message="Chimmy will surface your best moves, risks, and opportunities here."
          prompts={onOpenChat ? [{ label: 'Ask about my roster', onClick: onOpenChat }] : undefined}
        />
      )}

      {!isLoading && !error && (
        <div className="flex flex-col gap-3">
          {insights.map((ins) => (
            <ChimmyInsightCard
              key={ins.id}
              title={ins.title}
              summary={ins.summary}
              tag={ins.tag}
              severity={ins.severity}
              confidencePct={ins.confidencePct}
              onExpand={onOpenChat}
            />
          ))}

          <ChimmyPremiumGate
            requiredTier="premium"
            featureLabel="AI Recommendations"
            featureDescription="Actionable moves ranked by expected value. Upgrade to Pro to unlock."
            onUpgrade={onOpenChat}
          >
            {recommendations.map((rec) => (
              <ChimmyRecommendationCard
                key={rec.id}
                action={rec.action}
                rationale={rec.rationale}
                priority={rec.priority}
                actionType={rec.actionType}
                confidencePct={rec.confidencePct}
                onAction={rec.onAction}
                actionLabel={rec.actionLabel}
              />
            ))}
          </ChimmyPremiumGate>

          {showLearningSummary && <ChimmyAnalyticsSummaryPanel className="mt-1" />}
        </div>
      )}

      <ChimmyDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Dashboard AI">
        <ChimmyEmptyState
          title="Ask Chimmy"
          message="Ask about any of your leagues, teams, or players."
          prompts={onOpenChat ? [
            { label: 'Best waiver add?', onClick: () => { setDrawerOpen(false); onOpenChat() } },
            { label: 'Trade advice?', onClick: () => { setDrawerOpen(false); onOpenChat() } },
          ] : undefined}
        />
      </ChimmyDrawer>
    </ChimmySurfaceShell>
  )
}

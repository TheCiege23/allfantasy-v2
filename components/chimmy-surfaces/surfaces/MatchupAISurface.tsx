'use client'

import React, { useState } from 'react'
import { useAISurface } from '../AISurfaceContext'
import ChimmySurfaceShell from '../ChimmySurfaceShell'
import ChimmyInsightCard from '../ChimmyInsightCard'
import ChimmyConfidenceBadge from '../ChimmyConfidenceBadge'
import ChimmyThinkingState from '../ChimmyThinkingState'
import ChimmyEmptyState from '../ChimmyEmptyState'
import ChimmyModalDeepDive from '../ChimmyModalDeepDive'
import ChimmyLauncherButton from '../ChimmyLauncherButton'
import ChimmyExpandedExplanation from '../ChimmyExpandedExplanation'
import ChimmySurfaceActionFeed from '../ChimmySurfaceActionFeed'
import ChimmyUnifiedAlertFeed from '../ChimmyUnifiedAlertFeed'
import type { ChimmyFeedRecommendation, AIActionContext } from '@/lib/chimmy-actions'
import { buildActionContext } from '@/lib/chimmy-actions'

export interface MatchupAISurfaceProps {
  opponent?: string
  winProbability?: number
  swingPlayers?: Array<{ name: string; impact: string }>
  weatherAlert?: string
  insights?: Array<{ id: string; title: string; summary: string; tag?: string }>
  isLoading?: boolean
  onOpenChat?: () => void
  className?: string
  actionFeed?: ChimmyFeedRecommendation[]
  actionContext?: AIActionContext
}

export default function MatchupAISurface({
  opponent,
  winProbability,
  swingPlayers = [],
  weatherAlert,
  insights = [],
  isLoading = false,
  onOpenChat,
  className = '',
  actionFeed,
  actionContext,
}: MatchupAISurfaceProps) {
  const surface = useAISurface()
  const resolvedActionContext = actionContext ?? buildActionContext(surface)
  const [deepOpen, setDeepOpen] = useState(false)

  return (
    <ChimmySurfaceShell className={className}>
      <ChimmyUnifiedAlertFeed
        leagueId={surface.leagueState?.leagueId ?? undefined}
        surface="matchup"
        presentation="critical_drawer"
      />
      <ChimmyUnifiedAlertFeed
        leagueId={surface.leagueState?.leagueId ?? undefined}
        surface="matchup"
        presentation="floating_nudge"
      />

      {actionFeed && actionFeed.length > 0 && (
        <ChimmySurfaceActionFeed recommendations={actionFeed} context={resolvedActionContext} className="mb-4" />
      )}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide">
          {opponent ? `vs. ${opponent}` : 'Matchup AI'}
        </h3>
        <ChimmyLauncherButton label="Matchup Analysis" onClick={() => setDeepOpen(true)} />
      </div>

      {isLoading && <ChimmyThinkingState message="Running matchup simulation…" />}

      {!isLoading && winProbability !== undefined && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40 mb-1">Win Probability</p>
              <p className="text-3xl font-bold text-white">{winProbability}%</p>
            </div>
            <ChimmyConfidenceBadge pct={winProbability} />
          </div>
          {swingPlayers.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-xs text-white/40 mb-2">Swing players</p>
              <div className="space-y-1">
                {swingPlayers.map((p) => (
                  <div key={p.name} className="flex justify-between text-sm">
                    <span className="text-white">{p.name}</span>
                    <span className="text-white/50">{p.impact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {weatherAlert && (
        <ChimmyInsightCard title="Weather Alert" summary={weatherAlert} severity="warning" tag="Weather" className="mb-2" />
      )}

      {insights.map((ins) => (
        <ChimmyInsightCard key={ins.id} title={ins.title} summary={ins.summary} tag={ins.tag} className="mb-2" onExpand={() => setDeepOpen(true)} />
      ))}

      {!isLoading && !winProbability && insights.length === 0 && (
        <ChimmyEmptyState
          title="Matchup insights"
          message="Chimmy will analyze your matchup and project win probability."
          prompts={onOpenChat ? [{ label: 'Analyze my matchup', onClick: onOpenChat }] : undefined}
        />
      )}

      <ChimmyModalDeepDive open={deepOpen} onClose={() => setDeepOpen(false)} title="Matchup Deep Dive" subtitle={opponent ? `vs. ${opponent}` : undefined}>
        <div className="space-y-4">
          {winProbability !== undefined && (
            <ChimmyExpandedExplanation
              summary={`Your win probability is ${winProbability}%.`}
              details="This projection combines projected points, opponent lineup strength, injury risk, and recent form."
              defaultExpanded
            />
          )}
          {insights.map((ins) => (
            <ChimmyInsightCard key={ins.id} title={ins.title} summary={ins.summary} tag={ins.tag} />
          ))}
        </div>
      </ChimmyModalDeepDive>
    </ChimmySurfaceShell>
  )
}

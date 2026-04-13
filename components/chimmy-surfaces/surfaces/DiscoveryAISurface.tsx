'use client'

import React from 'react'
import ChimmySurfaceShell from '../ChimmySurfaceShell'
import ChimmyInsightCard from '../ChimmyInsightCard'
import ChimmyThinkingState from '../ChimmyThinkingState'
import ChimmyEmptyState from '../ChimmyEmptyState'
import ChimmyLauncherButton from '../ChimmyLauncherButton'

export interface DiscoveryAISurfaceProps {
  /** League match suggestions */
  leagueMatches?: Array<{ id: string; name: string; sport: string; format: string; description: string }>
  insights?: Array<{ id: string; title: string; summary: string; tag?: string }>
  isLoading?: boolean
  onJoinLeague?: (leagueId: string) => void
  onOpenChat?: () => void
  className?: string
}

export default function DiscoveryAISurface({
  leagueMatches = [],
  insights = [],
  isLoading = false,
  onJoinLeague,
  onOpenChat,
  className = '',
}: DiscoveryAISurfaceProps) {
  return (
    <ChimmySurfaceShell className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide">League Discovery</h3>
        {onOpenChat && <ChimmyLauncherButton label="Find a League" onClick={onOpenChat} />}
      </div>

      {isLoading && <ChimmyThinkingState message="Finding leagues for you…" />}

      {!isLoading && (
        <div className="space-y-2">
          {leagueMatches.map((league) => (
            <div key={league.id} className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{league.name}</p>
                <p className="text-xs text-white/50">{league.sport} · {league.format}</p>
                <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{league.description}</p>
              </div>
              {onJoinLeague && (
                <button
                  onClick={() => onJoinLeague(league.id)}
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
                >
                  Join
                </button>
              )}
            </div>
          ))}

          {insights.map((ins) => (
            <ChimmyInsightCard key={ins.id} title={ins.title} summary={ins.summary} tag={ins.tag} />
          ))}

          {leagueMatches.length === 0 && insights.length === 0 && (
            <ChimmyEmptyState
              title="Discover leagues"
              message="Chimmy can match you to leagues based on your preferences, skill level, and sport."
              prompts={onOpenChat ? [{ label: 'Find a league for me', onClick: onOpenChat }] : undefined}
            />
          )}
        </div>
      )}
    </ChimmySurfaceShell>
  )
}

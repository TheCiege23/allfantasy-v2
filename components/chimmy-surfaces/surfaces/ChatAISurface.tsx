'use client'

import React from 'react'
import { useAISurface } from '../AISurfaceContext'
import ChimmySurfaceShell from '../ChimmySurfaceShell'
import ChimmyInsightCard from '../ChimmyInsightCard'
import ChimmyLauncherButton from '../ChimmyLauncherButton'
import ChimmySurfaceActionFeed from '../ChimmySurfaceActionFeed'
import type { ChimmyFeedRecommendation, AIActionContext } from '@/lib/chimmy-actions'
import { buildActionContext } from '@/lib/chimmy-actions'

export interface ChatAISurfaceProps {
  /** Contextual insight cards shown above the chat area */
  contextInsights?: Array<{ id: string; title: string; summary: string; tag?: string }>
  /** Called when user taps "Open Chimmy Chat" */
  onOpenChat?: () => void
  actionFeed?: ChimmyFeedRecommendation[]
  actionContext?: AIActionContext
  className?: string
}

/**
 * ChatAISurface — injects contextual Chimmy insights into a chat thread view.
 * Typically rendered at the top of a DM or league chat screen.
 */
export default function ChatAISurface({
  contextInsights = [],
  onOpenChat,
  className = '',
  actionFeed,
  actionContext,
}: ChatAISurfaceProps) {
  const surface = useAISurface()
  const resolvedActionContext = actionContext ?? buildActionContext(surface)
  if (contextInsights.length === 0 && !onOpenChat) return null

  return (
    <ChimmySurfaceShell className={className}>
      {actionFeed && actionFeed.length > 0 && (
        <ChimmySurfaceActionFeed recommendations={actionFeed} context={resolvedActionContext} className="mb-4" />
      )}
      {contextInsights.length > 0 && (
        <div className="space-y-2 mb-3">
          {contextInsights.map((ins) => (
            <ChimmyInsightCard key={ins.id} title={ins.title} summary={ins.summary} tag={ins.tag} onExpand={onOpenChat} />
          ))}
        </div>
      )}
      {onOpenChat && (
        <div className="flex justify-end">
          <ChimmyLauncherButton label="Ask Chimmy" onClick={onOpenChat} />
        </div>
      )}
    </ChimmySurfaceShell>
  )
}

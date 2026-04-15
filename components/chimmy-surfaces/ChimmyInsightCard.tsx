'use client'

import React from 'react'
import { Sparkles, ChevronRight } from 'lucide-react'

export type ChimmyInsightSeverity = 'info' | 'warning' | 'success' | 'critical'

export interface ChimmyInsightCardProps {
  title: string
  summary: string
  severity?: ChimmyInsightSeverity
  /** e.g. 'Waiver Wire', 'Trade Opportunity', 'Matchup Alert' */
  tag?: string
  /** Confidence percentage 0–100 */
  confidencePct?: number
  /** Called when user taps the card for deep dive */
  onExpand?: () => void
  className?: string
}

const SEVERITY_STYLES: Record<ChimmyInsightSeverity, string> = {
  info:     'border-blue-500/30 bg-blue-500/5',
  warning:  'border-amber-500/30 bg-amber-500/5',
  success:  'border-emerald-500/30 bg-emerald-500/5',
  critical: 'border-red-500/30 bg-red-500/5',
}

const SEVERITY_ICON_COLOR: Record<ChimmyInsightSeverity, string> = {
  info:     'text-blue-400',
  warning:  'text-amber-400',
  success:  'text-emerald-400',
  critical: 'text-red-400',
}

export default function ChimmyInsightCard({
  title,
  summary,
  severity = 'info',
  tag,
  confidencePct,
  onExpand,
  className = '',
}: ChimmyInsightCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${SEVERITY_STYLES[severity]} ${className}`}
    >
      <div className="flex items-start gap-3">
        <Sparkles className={`mt-0.5 h-4 w-4 shrink-0 ${SEVERITY_ICON_COLOR[severity]}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{title}</span>
            {tag && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
                {tag}
              </span>
            )}
            {confidencePct !== undefined && (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/50">
                {confidencePct}% confident
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/70 leading-relaxed">{summary}</p>
        </div>
        {onExpand && (
          <button
            onClick={onExpand}
            aria-label="Expand insight"
            className="rounded p-0.5 hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="mt-0.5 h-4 w-4 text-white/30" />
          </button>
        )}
      </div>
    </div>
  )
}

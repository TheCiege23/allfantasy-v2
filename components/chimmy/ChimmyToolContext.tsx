'use client'

import React from 'react'
import { FileText } from 'lucide-react'

export interface ChimmyToolContextProps {
  /** Tool name (e.g. "Trade Analyzer", "Waiver AI") */
  toolName?: string
  /** Short summary or context passed when opening "Open result in Chimmy" */
  summary?: string
  leagueName?: string | null
  sport?: string | null
  className?: string
}

/**
 * Displays context when Chimmy was opened from a tool (e.g. Open result in Chimmy).
 * Calm, minimal — so Chimmy and the user share the same context.
 */
export default function ChimmyToolContext({
  toolName,
  summary,
  leagueName,
  sport,
  className = '',
}: ChimmyToolContextProps) {
  if (!toolName && !summary && !leagueName && !sport) return null

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm ${className}`}
      data-chimmy-tool-context
    >
      <div className="flex items-start gap-2">
        <FileText className="h-4 w-4 text-white/40 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          {toolName && (
            <p className="font-medium text-white/80">
              Context from {toolName}
              {(leagueName || sport) && (
                <span className="text-white/50 font-normal">
                  {[leagueName, sport].filter(Boolean).join(' · ')}
                </span>
              )}
            </p>
          )}
          {summary && <p className="mt-0.5 text-white/60">{summary}</p>}
          {!toolName && (leagueName || sport) && (
            <p className="text-white/60">{[leagueName, sport].filter(Boolean).join(' · ')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

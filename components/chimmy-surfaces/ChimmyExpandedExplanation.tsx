'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface ChimmyExpandedExplanationProps {
  /** Short teaser shown collapsed */
  summary: string
  /** Full explanation shown when expanded */
  details: string
  /** Optional: what the data says section */
  evidence?: string
  /** Optional: caveats / uncertainty */
  caveats?: string[]
  /** Start in expanded state */
  defaultExpanded?: boolean
  className?: string
}

export default function ChimmyExpandedExplanation({
  summary,
  details,
  evidence,
  caveats,
  defaultExpanded = false,
  className = '',
}: ChimmyExpandedExplanationProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 ${className}`}>
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-sm text-white/80 leading-relaxed">{summary}</span>
        {expanded
          ? <ChevronUp className="h-4 w-4 shrink-0 text-white/40 ml-2" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-white/40 ml-2" />
        }
      </button>

      {expanded && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3">
          <p className="text-sm text-white/70 leading-relaxed">{details}</p>

          {evidence && (
            <div>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wide mb-1">What the data says</p>
              <p className="text-sm text-white/60">{evidence}</p>
            </div>
          )}

          {caveats && caveats.length > 0 && (
            <div>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wide mb-1">Caveats</p>
              <ul className="space-y-1">
                {caveats.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm text-white/50">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/30" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

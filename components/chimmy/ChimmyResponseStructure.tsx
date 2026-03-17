'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface ChimmyResponseStructureProps {
  /** Short direct answer */
  quickAnswer?: string
  /** "What the data says" - evidence / numbers */
  whatDataSays?: string
  /** "What it means" - interpretation */
  whatItMeans?: string
  /** Suggested action */
  actionPlan?: string
  /** Caveats / uncertainty */
  caveats?: string[]
  /** When true, show as expandable sections on mobile */
  collapsible?: boolean
  className?: string
}

/**
 * Evidence-first response structure. Renders optional sections when provided.
 * When only plain text is available, parent can pass quickAnswer only.
 */
export default function ChimmyResponseStructure({
  quickAnswer,
  whatDataSays,
  whatItMeans,
  actionPlan,
  caveats,
  collapsible = false,
  className = '',
}: ChimmyResponseStructureProps) {
  const [dataExpanded, setDataExpanded] = useState(!collapsible)
  const [meaningExpanded, setMeaningExpanded] = useState(!collapsible)

  const hasStructure = quickAnswer || whatDataSays || whatItMeans || actionPlan || (caveats && caveats.length > 0)
  if (!hasStructure) return null

  return (
    <div className={`space-y-3 text-sm ${className}`}>
      {quickAnswer && (
        <p className="text-white/95 leading-relaxed">{quickAnswer}</p>
      )}

      {whatDataSays && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
          {collapsible ? (
            <>
              <button
                type="button"
                onClick={() => setDataExpanded(!dataExpanded)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-white/80 hover:bg-white/[0.04]"
              >
                <span className="font-medium">What the data says</span>
                {dataExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {dataExpanded && <div className="px-3 pb-3 text-white/70">{whatDataSays}</div>}
            </>
          ) : (
            <div className="px-3 py-2">
              <p className="font-medium text-white/60 text-xs uppercase tracking-wider mb-1">What the data says</p>
              <p className="text-white/80">{whatDataSays}</p>
            </div>
          )}
        </div>
      )}

      {whatItMeans && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
          {collapsible ? (
            <>
              <button
                type="button"
                onClick={() => setMeaningExpanded(!meaningExpanded)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-white/80 hover:bg-white/[0.04]"
              >
                <span className="font-medium">What it means</span>
                {meaningExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {meaningExpanded && <div className="px-3 pb-3 text-white/70">{whatItMeans}</div>}
            </>
          ) : (
            <div className="px-3 py-2">
              <p className="font-medium text-white/60 text-xs uppercase tracking-wider mb-1">What it means</p>
              <p className="text-white/80">{whatItMeans}</p>
            </div>
          )}
        </div>
      )}

      {actionPlan && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
          <p className="font-medium text-cyan-200/90 text-xs uppercase tracking-wider mb-1">Suggested action</p>
          <p className="text-cyan-100/90">{actionPlan}</p>
        </div>
      )}

      {caveats && caveats.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <p className="font-medium text-amber-200/90 text-xs uppercase tracking-wider mb-1">Caveats</p>
          <ul className="list-disc list-inside text-amber-100/80 space-y-0.5">
            {caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

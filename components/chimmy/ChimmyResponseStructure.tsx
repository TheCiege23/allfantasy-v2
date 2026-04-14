'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ChimmyResponseSectionTitles } from '@/lib/chimmy-chat/types'

const DEFAULT_TITLES: Required<ChimmyResponseSectionTitles> = {
  shortAnswer: 'Short answer',
  whatItMeans: 'What it means',
  whatDataSays: 'What the data says',
  caveats: 'Caveats',
  recommendedAction: 'Recommended action',
}

export interface ChimmyResponseStructureProps {
  /** Short direct answer */
  quickAnswer?: string
  /** Evidence / numbers (or Tool link when orchestration-shaped) */
  whatDataSays?: string
  /** Interpretation (or Why when orchestration-shaped) */
  whatItMeans?: string
  /** Suggested action (or Follow-up when orchestration-shaped) */
  actionPlan?: string
  /** Caveats / uncertainty (or Confidence when orchestration-shaped) */
  caveats?: string[]
  /** Override default section labels (e.g. Direct / Why / Tool / Confidence / Follow-up). */
  sectionTitles?: ChimmyResponseSectionTitles
  /** When true, show as expandable sections on mobile */
  collapsible?: boolean
  className?: string
}

function mergeTitles(sectionTitles?: ChimmyResponseSectionTitles): Required<ChimmyResponseSectionTitles> {
  return {
    shortAnswer: sectionTitles?.shortAnswer?.trim() || DEFAULT_TITLES.shortAnswer,
    whatItMeans: sectionTitles?.whatItMeans?.trim() || DEFAULT_TITLES.whatItMeans,
    whatDataSays: sectionTitles?.whatDataSays?.trim() || DEFAULT_TITLES.whatDataSays,
    caveats: sectionTitles?.caveats?.trim() || DEFAULT_TITLES.caveats,
    recommendedAction: sectionTitles?.recommendedAction?.trim() || DEFAULT_TITLES.recommendedAction,
  }
}

/**
 * Evidence-first response structure. Renders optional sections when provided.
 * Order matches orchestration contract when titles are overridden: Direct → Why → Tool → Confidence → Follow-up.
 */
export default function ChimmyResponseStructure({
  quickAnswer,
  whatDataSays,
  whatItMeans,
  actionPlan,
  caveats,
  sectionTitles,
  collapsible = false,
  className = '',
}: ChimmyResponseStructureProps) {
  const titles = mergeTitles(sectionTitles)
  const [meaningExpanded, setMeaningExpanded] = useState(!collapsible)
  const [dataExpanded, setDataExpanded] = useState(!collapsible)

  const hasStructure =
    quickAnswer || whatDataSays || whatItMeans || actionPlan || (caveats && caveats.length > 0)
  if (!hasStructure) return null

  return (
    <div className={`space-y-3 text-sm ${className}`} data-testid="chimmy-response-structure">
      {quickAnswer && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <p className="font-medium text-white/60 text-xs uppercase tracking-wider mb-1">{titles.shortAnswer}</p>
          <p className="text-white/95 leading-relaxed">{quickAnswer}</p>
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
                data-testid="chimmy-structure-toggle-meaning"
              >
                <span className="font-medium">{titles.whatItMeans}</span>
                {meaningExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {meaningExpanded && <div className="px-3 pb-3 text-white/70">{whatItMeans}</div>}
            </>
          ) : (
            <div className="px-3 py-2">
              <p className="font-medium text-white/60 text-xs uppercase tracking-wider mb-1">{titles.whatItMeans}</p>
              <p className="text-white/80">{whatItMeans}</p>
            </div>
          )}
        </div>
      )}

      {whatDataSays && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
          {collapsible ? (
            <>
              <button
                type="button"
                onClick={() => setDataExpanded(!dataExpanded)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-white/80 hover:bg-white/[0.04]"
                data-testid="chimmy-structure-toggle-data"
              >
                <span className="font-medium">{titles.whatDataSays}</span>
                {dataExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {dataExpanded && <div className="px-3 pb-3 text-white/70">{whatDataSays}</div>}
            </>
          ) : (
            <div className="px-3 py-2">
              <p className="font-medium text-white/60 text-xs uppercase tracking-wider mb-1">{titles.whatDataSays}</p>
              <p className="text-white/80">{whatDataSays}</p>
            </div>
          )}
        </div>
      )}

      {caveats && caveats.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <p className="font-medium text-amber-200/90 text-xs uppercase tracking-wider mb-1">{titles.caveats}</p>
          <ul className="list-disc list-inside text-amber-100/80 space-y-0.5">
            {caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {actionPlan && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
          <p className="font-medium text-cyan-200/90 text-xs uppercase tracking-wider mb-1">{titles.recommendedAction}</p>
          <p className="text-cyan-100/90">{actionPlan}</p>
        </div>
      )}
    </div>
  )
}

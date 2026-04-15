'use client'

/**
 * ChimmySurfaceActionFeed — composites multiple ChimmyFeedRecommendation items
 * in one of three layout modes:
 *   - 'stack': vertical list (default)
 *   - 'grid':  2-column grid on md+
 *   - 'strip': compact horizontal scroll via ChimmyQuickActionStrip (one strip per rec)
 *
 * Includes progressive disclosure: maxVisible (default 3) with "Show N more" toggle.
 */

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import type { ChimmyFeedRecommendation, AIActionContext } from '@/lib/chimmy-actions'
import ChimmyActionRecommendationCard from './ChimmyActionRecommendationCard'
import ChimmyQuickActionStrip from './ChimmyQuickActionStrip'

export interface ChimmySurfaceActionFeedProps {
  recommendations: ChimmyFeedRecommendation[]
  context: AIActionContext
  /** Visual layout mode */
  layout?: 'stack' | 'grid' | 'strip'
  /** Max cards/strips shown before "Show more". Default 3. */
  maxVisible?: number
  /** Shown when recommendations.length === 0 */
  emptyState?: React.ReactNode
  onActionSuccess?: (rec: ChimmyFeedRecommendation) => void
  className?: string
}

const DEFAULT_MAX = 3

export default function ChimmySurfaceActionFeed({
  recommendations,
  context,
  layout = 'stack',
  maxVisible = DEFAULT_MAX,
  emptyState,
  onActionSuccess,
  className = '',
}: ChimmySurfaceActionFeedProps) {
  const [showAll, setShowAll] = useState(false)

  const visible = recommendations.filter((r) => !r.isDismissed)
  const capped = showAll ? visible : visible.slice(0, maxVisible)
  const hiddenCount = visible.length - maxVisible

  if (visible.length === 0) {
    if (emptyState) return <>{emptyState}</>
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-white/30">
        <Sparkles className="h-6 w-6 text-indigo-600/50" aria-hidden="true" />
        <p className="text-sm">No recommendations yet</p>
      </div>
    )
  }

  /* ── Strip layout ─────────────────────────────────────────────────── */
  if (layout === 'strip') {
    // Collect all primary actions from visible recs into one flat strip
    const actions = capped
      .flatMap((r) => [r.primaryAction, ...(r.secondaryActions ?? [])])
      .filter(Boolean) as import('@/lib/chimmy-actions').AIAction[]

    return (
      <div className={className}>
        <ChimmyQuickActionStrip
          actions={actions}
          context={context}
          label="Chimmy suggests:"
        />
      </div>
    )
  }

  /* ── Stack / Grid layouts ─────────────────────────────────────────── */
  return (
    <div className={['flex flex-col gap-3', className].join(' ')}>
      <div
        className={
          layout === 'grid'
            ? 'grid grid-cols-1 gap-3 md:grid-cols-2'
            : 'flex flex-col gap-3'
        }
      >
        {capped.map((rec) => (
          <ChimmyActionRecommendationCard
            key={rec.id}
            rec={rec}
            context={context}
            onActionSuccess={() => onActionSuccess?.(rec)}
          />
        ))}
      </div>

      {/* Show more / less toggle */}
      {!showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="flex items-center justify-center gap-1 rounded-lg border border-white/[0.08] py-1.5 text-xs font-medium text-white/40 transition-all hover:border-indigo-500/40 hover:text-white/70"
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          Show {hiddenCount} more suggestion{hiddenCount !== 1 ? 's' : ''}
        </button>
      )}

      {showAll && visible.length > maxVisible && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="flex items-center justify-center gap-1 rounded-lg border border-white/[0.08] py-1.5 text-xs font-medium text-white/40 transition-all hover:border-white/20 hover:text-white/70"
        >
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          Show less
        </button>
      )}
    </div>
  )
}

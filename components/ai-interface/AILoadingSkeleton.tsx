'use client'

import React from 'react'

export interface AILoadingSkeletonProps {
  /** Show deterministic block placeholder */
  showFacts?: boolean
  /** Show synthesis block placeholder */
  showSynthesis?: boolean
  /** Show action block placeholder */
  showAction?: boolean
  className?: string
}

/**
 * Loading skeleton for AI result. Use while waiting for orchestration response.
 */
export default function AILoadingSkeleton({
  showFacts = true,
  showSynthesis = true,
  showAction = true,
  className = '',
}: AILoadingSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {showFacts && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 animate-pulse">
          <div className="h-4 w-24 rounded bg-white/10 mb-3" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-4/5 rounded bg-white/10" />
            <div className="h-3 w-3/5 rounded bg-white/10" />
          </div>
        </div>
      )}
      {showSynthesis && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 animate-pulse">
          <div className="h-4 w-20 rounded bg-white/10 mb-3" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-2/3 rounded bg-white/10" />
          </div>
        </div>
      )}
      {showAction && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 animate-pulse">
          <div className="h-4 w-32 rounded bg-white/10 mb-2" />
          <div className="h-3 w-3/4 rounded bg-white/10" />
        </div>
      )}
    </div>
  )
}

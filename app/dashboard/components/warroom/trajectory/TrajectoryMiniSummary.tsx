'use client'

import type { ReactNode } from 'react'
import type { TrajectorySummary } from '@/lib/trajectory/summarize'
import { DeltaChip } from './DeltaChip'
import { computeDisplayDelta } from './displayDelta'

export interface TrajectoryMiniItem {
  summary: TrajectorySummary | null | undefined
  label: ReactNode
  decimals?: number
  invert?: boolean
}

export interface TrajectoryMiniSummaryProps {
  /** 2–4 metric changes to show compactly. */
  items: TrajectoryMiniItem[]
  className?: string
}

/**
 * A compact group of labelled delta chips (2–4 metrics). Renders ONLY the items
 * that have a real, display-visible change, and self-gates entirely — returns
 * null — when none do. This keeps any card it lives in visually unchanged until
 * real trajectory exists.
 */
export function TrajectoryMiniSummary({ items, className }: TrajectoryMiniSummaryProps) {
  const visible = items.filter((item) => computeDisplayDelta(item.summary, item.decimals ?? 0)?.visible)
  if (visible.length === 0) return null

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className ?? ''}`}>
      {visible.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-[10px] text-white/45">
          <span className="uppercase tracking-wide">{item.label}</span>
          <DeltaChip summary={item.summary} decimals={item.decimals ?? 0} invert={item.invert} />
        </span>
      ))}
    </div>
  )
}

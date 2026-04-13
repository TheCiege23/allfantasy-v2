'use client'

/**
 * ChimmyConfidenceBadge — wraps the existing ConfidencePill from components/ai
 * with Chimmy-specific labeling and color mapping.
 */

import React from 'react'

export interface ChimmyConfidenceBadgeProps {
  /** 0–100 */
  pct: number
  /** Show numeric percentage alongside label */
  showPct?: boolean
  className?: string
}

function getLabel(pct: number): string {
  if (pct >= 85) return 'High confidence'
  if (pct >= 65) return 'Moderate confidence'
  if (pct >= 40) return 'Low confidence'
  return 'Uncertain'
}

function getColor(pct: number): string {
  if (pct >= 85) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  if (pct >= 65) return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  if (pct >= 40) return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  return 'bg-red-500/20 text-red-300 border-red-500/30'
}

export default function ChimmyConfidenceBadge({ pct, showPct = true, className = '' }: ChimmyConfidenceBadgeProps) {
  const clampedPct = Math.max(0, Math.min(100, pct))
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${getColor(clampedPct)} ${className}`}
      title={`Confidence: ${clampedPct}%`}
    >
      {getLabel(clampedPct)}
      {showPct && <span className="opacity-70">· {clampedPct}%</span>}
    </span>
  )
}

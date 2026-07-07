'use client'

import { useLanguage } from '@/components/i18n/LanguageProviderClient'

export interface ConfidenceChipProps {
  /** Source-provided confidence in [0, 1], or null/undefined. Never fabricated upstream. */
  confidence: number | null | undefined
  className?: string
}

/**
 * Renders a source's confidence, and ONLY when the source actually reports one.
 * A null/undefined/non-finite confidence renders nothing — the primitive never
 * invents a confidence value.
 */
export function ConfidenceChip({ confidence, className }: ConfidenceChipProps) {
  const { tInterpolate } = useLanguage()
  if (confidence == null || !Number.isFinite(confidence)) return null
  const pct = Math.round(confidence * 100)
  return (
    <span
      className={`rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-white/45 ${className ?? ''}`}
    >
      {tInterpolate('dashboard.trajectory.confidence', { pct })}
    </span>
  )
}

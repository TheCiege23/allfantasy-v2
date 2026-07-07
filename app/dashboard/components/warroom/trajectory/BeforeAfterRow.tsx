'use client'

import type { ReactNode } from 'react'
import type { TrajectorySummary } from '@/lib/trajectory/summarize'
import { DeltaChip } from './DeltaChip'

export interface BeforeAfterRowProps {
  summary: TrajectorySummary | null | undefined
  /** Metric label, e.g. "Playoff Odds". */
  label: ReactNode
  /** Display precision, shared with the delta chip. */
  decimals?: number
  /** Lower-is-better metric — passed through to the delta chip color. */
  invert?: boolean
  /** Optional value formatter, e.g. (n) => `${n}%`. Defaults to the rounded number. */
  format?: (value: number) => string
  /** Optional source/timestamp caption, e.g. "since Week 4". Caller-localized. */
  sourceLabel?: ReactNode
  className?: string
}

/**
 * A compact "previous → current (delta)" row. Renders the before→after pair only
 * when a real prior point exists; with no history it honestly shows the current
 * value alone (no fabricated "before"). Returns null when there is no value at all.
 */
export function BeforeAfterRow({
  summary,
  label,
  decimals = 0,
  invert = false,
  format,
  sourceLabel,
  className,
}: BeforeAfterRowProps) {
  if (!summary || summary.currentValue == null) return null

  const round = (n: number) => {
    const factor = 10 ** decimals
    return Math.round(n * factor) / factor
  }
  const fmt = (n: number) => (format ? format(round(n)) : String(round(n)))

  const hasPrior = summary.hasChange && summary.previousValue != null

  return (
    <div className={`flex items-center justify-between gap-2 text-[11px] ${className ?? ''}`}>
      <span className="min-w-0 truncate text-white/50">{label}</span>
      <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
        {hasPrior ? (
          <>
            <span className="text-white/35">{fmt(summary.previousValue as number)}</span>
            <span className="text-white/25" aria-hidden>→</span>
          </>
        ) : null}
        <span className="font-semibold text-white/80">{fmt(summary.currentValue)}</span>
        <DeltaChip summary={summary} decimals={decimals} invert={invert} />
        {sourceLabel ? <span className="text-white/30">{sourceLabel}</span> : null}
      </span>
    </div>
  )
}

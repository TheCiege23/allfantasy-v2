'use client'

import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import type { TrajectorySummary } from '@/lib/trajectory/summarize'
import { computeDisplayDelta, deltaTone } from './displayDelta'

const TONE_CLASS: Record<'positive' | 'negative' | 'neutral', string> = {
  positive: 'text-emerald-300',
  negative: 'text-red-300',
  neutral: 'text-white/40',
}

const GLYPH: Record<'up' | 'down' | 'flat', string> = {
  up: '▲',
  down: '▼',
  flat: '–',
}

export interface DeltaChipProps {
  /** Compact trajectory summary for the metric (or null/undefined). */
  summary: TrajectorySummary | null | undefined
  /** Display precision — 0 for percent points / integers, 1 for wins, etc. */
  decimals?: number
  /** Lower-is-better metric (seed, rank, elimination risk) — flips good/bad color. */
  invert?: boolean
  /** Show a neutral "no change" chip when the comparison is flat. Default false (self-gate). */
  showFlat?: boolean
  className?: string
}

/**
 * The one reusable trajectory delta chip. Renders a subtle up/down (or optional
 * flat) indicator with positive/negative/neutral color semantics, tied to the
 * displayed rounded value. Returns null — silently self-gates — whenever there is
 * no honest, display-visible change (unsupported metric, no prior snapshot, or a
 * sub-resolution move). Never fabricates movement.
 */
export function DeltaChip({ summary, decimals = 0, invert = false, showFlat = false, className }: DeltaChipProps) {
  const { tInterpolate, t } = useLanguage()
  const delta = computeDisplayDelta(summary, decimals)
  if (!delta) return null
  if (!delta.visible && !showFlat) return null

  const tone = deltaTone(delta.direction, invert)
  const aria =
    delta.direction === 'flat'
      ? t('dashboard.trajectory.changeFlat')
      : tInterpolate(
          delta.direction === 'up' ? 'dashboard.trajectory.changeUp' : 'dashboard.trajectory.changeDown',
          { value: delta.magStr },
        )

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[9px] font-bold tabular-nums ${TONE_CLASS[tone]} ${className ?? ''}`}
      aria-label={aria}
    >
      <span aria-hidden>{GLYPH[delta.direction]}</span>
      {delta.direction === 'flat' ? null : delta.magStr}
    </span>
  )
}

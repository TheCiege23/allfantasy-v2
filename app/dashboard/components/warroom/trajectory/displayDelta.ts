/**
 * Dashboard V2 Phase 3.5 — Trajectory Visual Language: display math.
 *
 * Pure, React-free. Turns a `TrajectorySummary` into the change a chip should
 * DISPLAY, tied to the same rounding the card shows so a chip can never disagree
 * with the number next to it and stays silent for movement below display
 * resolution. Returns null when there is nothing honest to show (unsupported,
 * or no real prior point) — the single source of the self-gate rule for every
 * trajectory primitive.
 */
import type { TrajectorySummary } from '@/lib/trajectory/summarize'

export type DisplayDirection = 'up' | 'down' | 'flat'

export interface DisplayDelta {
  direction: DisplayDirection
  /** Absolute change at display resolution. */
  magnitude: number
  /** Pre-formatted magnitude string honoring `decimals`. */
  magStr: string
  /** True when the change is non-zero at display resolution (worth showing). */
  visible: boolean
}

/**
 * @param summary  the metric's compact trajectory summary (or null/undefined)
 * @param decimals display precision (0 for integers/percent points, 1 for wins…)
 * @returns the display delta, or null when there is no honest change to render
 */
export function computeDisplayDelta(
  summary: TrajectorySummary | null | undefined,
  decimals = 0,
): DisplayDelta | null {
  // Self-gate: no real store, or no real comparison (< 2 points).
  if (!summary || !summary.supported || !summary.hasChange) return null
  const { currentValue, previousValue } = summary
  if (currentValue == null || previousValue == null) return null

  const factor = 10 ** decimals
  const displayDelta = Math.round(currentValue * factor) / factor - Math.round(previousValue * factor) / factor
  const direction: DisplayDirection = displayDelta > 0 ? 'up' : displayDelta < 0 ? 'down' : 'flat'
  const magnitude = Math.abs(displayDelta)
  const magStr = decimals > 0 ? magnitude.toFixed(decimals) : String(magnitude)
  return { direction, magnitude, magStr, visible: displayDelta !== 0 }
}

/**
 * Good/bad semantics. `invert` is for metrics where lower is better (seed, rank,
 * elimination risk): a downward move is the good one. Flat is always neutral.
 */
export function deltaTone(direction: DisplayDirection, invert = false): 'positive' | 'negative' | 'neutral' {
  if (direction === 'flat') return 'neutral'
  const isGood = invert ? direction === 'down' : direction === 'up'
  return isGood ? 'positive' : 'negative'
}

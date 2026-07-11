/**
 * Trajectory Foundation — compact summary.
 *
 * `Trajectory` carries the full `history` array (all real points). Consumers
 * that only need "what changed" — and especially anything crossing a
 * server→client boundary — want a lean, history-free shape. `summarizeTrajectory`
 * is that shape: the same honest facts (supported? changed? by how much? source
 * confidence? real reason?) with no per-point payload.
 *
 * It invents nothing — every field is copied straight from the trajectory, and
 * `hasChange` is simply "a real delta exists" (≥ 2 real points).
 */
import type { Trajectory, TrajectoryDirection } from './types'

export interface TrajectorySummary {
  metricId: string
  /** Is a real historical store behind this metric? */
  supported: boolean
  /** Does a real delta exist (≥ 2 real points)? Consumers self-gate on this. */
  hasChange: boolean
  direction: TrajectoryDirection | null
  /** current − previous, or null when there is no change. */
  absolute: number | null
  /** Percent change, or null (no change, or zero baseline). */
  percent: number | null
  /** Source-provided confidence in [0, 1], or null. Never invented. */
  confidence: number | null
  currentValue: number | null
  previousValue: number | null
  /** Real engine reasoning for the change, or null. Never fabricated. */
  whyChanged: string | null
}

export function summarizeTrajectory(t: Trajectory): TrajectorySummary {
  return {
    metricId: t.metricId,
    supported: t.supported,
    hasChange: t.delta != null,
    direction: t.delta?.direction ?? null,
    absolute: t.delta?.absolute ?? null,
    percent: t.delta?.percent ?? null,
    confidence: t.delta?.confidence ?? null,
    currentValue: t.current?.value ?? null,
    previousValue: t.previous?.value ?? null,
    whyChanged: t.whyChanged,
  }
}

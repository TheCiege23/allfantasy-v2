/**
 * Trajectory Foundation — Explain hooks (Deliverable 5).
 *
 * Resolves `whyChanged`: a REAL reason for the latest change, or `null`. It
 * never generates a fake explanation — if no engine reasoning exists, the honest
 * answer is `null` and consumers should render nothing.
 *
 * Resolution order (first real reason wins):
 *   1. The adapter's own `explainChange` — engine-specific reasoning.
 *   2. A `reason` the source attached to the current point.
 *   3. `null`.
 *
 * A reason is only meaningful when there is a change to explain, so this returns
 * `null` unless at least two real points exist.
 */
import type { TrajectoryAdapter, TrajectoryPoint } from './types'

export function resolveWhyChanged(
  adapter: Pick<TrajectoryAdapter, 'explainChange'>,
  orderedPoints: TrajectoryPoint[],
): string | null {
  if (orderedPoints.length < 2) return null

  const adapterReason = adapter.explainChange?.(orderedPoints)
  if (adapterReason) return adapterReason

  const current = orderedPoints[orderedPoints.length - 1]
  return current?.reason ?? null
}

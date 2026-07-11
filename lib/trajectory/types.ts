/**
 * Trajectory Foundation — the platform's single, provider-agnostic answer to
 * "what changed, and why."
 *
 * A `Trajectory` normalizes any metric's real, captured history into one shape
 * that every Decision OS module (Manager / Commissioner / League / Trade /
 * Waiver / Draft OS, Chimmy, and Dashboard V2) can consume identically.
 *
 * Non-negotiable invariant (see AUDIT.md): every point is a REAL observation.
 * Nothing here interpolates, back-fills, or synthesizes a value. When history
 * does not exist, the honest result is `delta: null` / `supported: false`, not
 * a fabricated movement. Current state is not history.
 */

export type TrajectoryDirection = 'up' | 'down' | 'flat'

/** One real, captured observation of a metric. Never synthesized. */
export interface TrajectoryPoint {
  /** The observed value. */
  value: number
  /** ISO-8601 timestamp of when this value was captured / was valid. */
  timestamp: string
  /**
   * Source-provided confidence in [0, 1], present ONLY when the producing
   * engine actually reports one. Never invented — omit when the source is silent.
   */
  confidence?: number
  /** Optional human label for the point, e.g. "Week 5". */
  label?: string
  /**
   * Optional engine reasoning attached to this observation, surfaced by the
   * Explain hook as `whyChanged`. Null/omitted when the source gives none.
   */
  reason?: string | null
}

/** The change between two real points. Absent when fewer than 2 points exist. */
export interface TrajectoryDelta {
  /** current.value − previous.value. */
  absolute: number
  /**
   * Percentage change relative to the previous value, or `null` when it cannot
   * be honestly computed (previous value is 0 — there is no denominator).
   */
  percent: number | null
  direction: TrajectoryDirection
  /**
   * Confidence of the change, present ONLY when the source reports one on the
   * current point. `null` otherwise — never fabricated.
   */
  confidence: number | null
  /** ISO timestamp the change is dated to (the current point's timestamp). */
  changedAt: string
}

/** A metric's history normalized into one common, consumable shape. */
export interface Trajectory {
  /** Namespaced metric id, e.g. "season.playoffProbability". */
  metricId: string
  /** Latest real point, or `null` when no history exists at all. */
  current: TrajectoryPoint | null
  /** The point compared against, or `null` when fewer than 2 points exist. */
  previous: TrajectoryPoint | null
  /** The computed change, or `null` when fewer than 2 points exist. */
  delta: TrajectoryDelta | null
  /** Every real point, ordered oldest → newest. May be empty or single-element. */
  history: TrajectoryPoint[]
  /**
   * Whether a real historical store backs this metric. `false` means the metric
   * is current-state only — consumers must NOT imply movement (delta is null).
   */
  supported: boolean
  /** Explain-hook output — real engine reasoning for the change, or `null`. */
  whyChanged: string | null
}

/**
 * A source of real, captured history for exactly one metric. Adapters own all
 * IO and normalization so the service and delta engine stay pure. `load` returns
 * the real points a source has — never a synthesized or interpolated one.
 */
export interface TrajectoryAdapter<Params = unknown> {
  /** Namespaced metric id this adapter produces. */
  readonly metricId: string
  /**
   * Whether this adapter is backed by a real historical store. Current-state-only
   * adapters set this `false` so `Trajectory.supported` propagates honestly.
   */
  readonly supported: boolean
  /** Load all real points for `params`, in any order (the service sorts them). */
  load(params: Params): Promise<TrajectoryPoint[]>
  /**
   * Optional Explain hook: given the ordered points (oldest → newest), return a
   * real reason for the latest change, or `null` when the source provides none.
   * Never generate a fake explanation.
   */
  explainChange?(points: TrajectoryPoint[]): string | null
}

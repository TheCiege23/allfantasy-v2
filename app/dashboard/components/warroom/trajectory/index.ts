/**
 * Dashboard V2 Trajectory Visual Language (Phase 3.5).
 *
 * The reusable UI primitives for "what changed" across Dashboard V2. Every card
 * (Season Outlook, Matchup Status, Injury Impact, League Health, Recommendations,
 * Commissioner metrics) consumes these instead of hand-rolling delta chips or
 * confidence badges. All self-gate honestly when no real trajectory exists.
 */

export { DeltaChip } from './DeltaChip'
export type { DeltaChipProps } from './DeltaChip'

export { ConfidenceChip } from './ConfidenceChip'
export type { ConfidenceChipProps } from './ConfidenceChip'

export { BeforeAfterRow } from './BeforeAfterRow'
export type { BeforeAfterRowProps } from './BeforeAfterRow'

export { TrajectoryMiniSummary } from './TrajectoryMiniSummary'
export type { TrajectoryMiniSummaryProps, TrajectoryMiniItem } from './TrajectoryMiniSummary'

export { computeDisplayDelta, deltaTone } from './displayDelta'
export type { DisplayDelta, DisplayDirection } from './displayDelta'

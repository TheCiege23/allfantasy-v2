import type { UserLineupPreferenceProfileInput } from '@/lib/lineup-decision-engine/types'
import type { LineupPreferenceTraitId } from './trait-ids'

export type LineupPreferenceEventKind =
  | 'ai_lineup_accepted'
  | 'ai_lineup_rejected'
  | 'bench_promoted'
  | 'auto_sub_allowed'
  | 'auto_sub_denied'
  | 'injury_contingency_respected'
  | 'injury_contingency_overridden'
  | 'lineup_outcome_feedback'

export interface LineupPreferenceExample {
  summary: string
  at: string
  kind?: string
}

export interface TraitStoredState {
  traitId: string
  confidence: number
  sampleSize: number
  lastReinforcedAt: Date | null
  examples: LineupPreferenceExample[]
  metadata: Record<string, unknown> | null
}

export interface UserLineupPreferenceProfile {
  userId: string
  traits: TraitStoredState[]
  /** Rolling rates from recent events (not persisted as traits). */
  stats: {
    autoSubAllowRate: number
    injuryContingencyOverrideRate: number
    eventsSampleSize: number
  }
  /** Ready for `POST /api/lineup/optimize` / premium engine */
  optimizerProfileInput: UserLineupPreferenceProfileInput
  /** Human-readable for UI */
  traitSummary: Record<string, { confidence: number; sampleSize: number; lastReinforcedAt: string | null }>
}

export interface RecordLineupPreferenceEventInput {
  kind: LineupPreferenceEventKind
  payload: Record<string, unknown>
}

export type ArchetypeHint = 'veteran' | 'rookie' | 'star' | 'streamer' | 'unknown'

export interface AiAcceptPayload {
  /** User accepted AI when the call was close vs alternatives */
  closeCall?: boolean
  /** Objective edge magnitude (e.g. projected points); large edge → weak trait reinforcement */
  edgeMagnitude?: number
  /** Traits implied by the accepted recommendation */
  reinforceTraits?: LineupPreferenceTraitId[]
}

export interface AiRejectPayload {
  /** Traits the rejected AI suggestion aligned with (penalize) */
  rejectedTraits?: LineupPreferenceTraitId[]
  /** Traits aligned with what the user did instead (reinforce) */
  userAlignedTraits?: LineupPreferenceTraitId[]
}

export interface BenchPromotedPayload {
  position: string
  archetype?: ArchetypeHint
  slotCode?: string
  playerName?: string
}

export interface OutcomeFeedbackPayload {
  /** Trait ids that were leaned on in the close decision */
  traitsInvolved?: LineupPreferenceTraitId[]
  /** If actual outcome was poor vs projection, traits lose weight */
  underperformed?: boolean
}

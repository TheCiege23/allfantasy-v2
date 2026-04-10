/**
 * Mini-Game Engine — Core Types
 *
 * Reusable challenge/competition engine for:
 * - Survivor immunity challenges
 * - Big Brother HOH/POV
 * - Guillotine survival games
 * - Tournament tiebreakers
 * - Zombie ambush games
 * - Custom commissioner challenges
 * - Future format mini-games
 */

// ============================================================================
// MINI-GAME DEFINITION (template)
// ============================================================================

export type MiniGameCategory =
  | 'fantasy_performance'
  | 'multi_factor'
  | 'randomized'
  | 'head_to_head'
  | 'event_based'
  | 'social'
  | 'prediction'
  | 'custom'

export type MiniGameParticipantType = 'individual' | 'team' | 'tribe' | 'all'

export type MiniGameState =
  | 'draft'
  | 'scheduled'
  | 'pending_data'
  | 'active'
  | 'resolving'
  | 'completed'
  | 'locked'
  | 'overridden'
  | 'archived'

export type MiniGameResultType =
  | 'single_winner'
  | 'multiple_winners'
  | 'ranked'
  | 'pass_fail'
  | 'safe_unsafe'

export type MiniGameRewardType =
  | 'hoh_power'
  | 'immunity'
  | 'veto_eligibility'
  | 'waiver_priority'
  | 'extra_faab'
  | 'safe_status'
  | 'bonus_points'
  | 'draft_advantage'
  | 'pick_swap'
  | 'temporary_power'
  | 'custom'

export type MiniGamePenaltyType =
  | 'nomination_risk'
  | 'tribal_council'
  | 'eviction_risk'
  | 'bench_lock'
  | 'reduced_power'
  | 'challenge_loss'
  | 'public_disadvantage'
  | 'custom'

export interface MiniGameScoringRule {
  metric: string
  weight: number
  direction: 'highest' | 'lowest' | 'closest_to'
  targetValue?: number
  sourceType: 'fantasy_score' | 'projection' | 'player_stat' | 'position_group' | 'bench' | 'manual' | 'random' | 'vote_count'
  sourceFilter?: Record<string, unknown>
}

export interface MiniGameTiebreaker {
  order: number
  metric: string
  direction: 'highest' | 'lowest' | 'earliest' | 'random'
}

export interface MiniGameDefinition {
  id: string
  name: string
  description: string
  category: MiniGameCategory
  participantType: MiniGameParticipantType
  resultType: MiniGameResultType
  supportedLeagueTypes: string[]
  supportedSports: string[]
  scoringRules: MiniGameScoringRule[]
  tiebreakers: MiniGameTiebreaker[]
  rewards: MiniGameRewardType[]
  penalties: MiniGamePenaltyType[]
  requiresManualInput: boolean
  allowsRandomModifier: boolean
  randomWeight: number
  minParticipants: number
  maxParticipants: number | null
  estimatedDurationMinutes: number
  isActive: boolean
}

// ============================================================================
// MINI-GAME INSTANCE (live game)
// ============================================================================

export interface MiniGameInstance {
  id: string
  definitionId: string
  leagueId: string
  week: number
  phase: string | null
  state: MiniGameState
  participantIds: string[]
  startedAt: string | null
  resolvedAt: string | null
  lockedAt: string | null
  results: MiniGameResult[]
  winnerId: string | null
  winnerIds: string[]
  metadata: Record<string, unknown>
  overrideReason: string | null
  overrideBy: string | null
}

export interface MiniGameResult {
  participantId: string
  displayName: string
  score: number
  rank: number
  isWinner: boolean
  isSafe: boolean
  breakdown: Array<{ metric: string; value: number; weight: number; weighted: number }>
  tiebrokenBy: string | null
}

export interface MiniGameParticipantInput {
  participantId: string
  displayName: string
  inputs: Record<string, number | string>
}

// ============================================================================
// MINI-GAME REWARD/PENALTY ASSIGNMENT
// ============================================================================

export interface MiniGameRewardAssignment {
  instanceId: string
  participantId: string
  rewardType: MiniGameRewardType
  description: string
  expiresAtWeek: number | null
  metadata: Record<string, unknown>
}

export interface MiniGamePenaltyAssignment {
  instanceId: string
  participantId: string
  penaltyType: MiniGamePenaltyType
  description: string
  expiresAtWeek: number | null
  metadata: Record<string, unknown>
}

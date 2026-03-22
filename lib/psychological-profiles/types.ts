/**
 * Psychological Profiles Engine — types for profiles, labels, evidence, and sport.
 */

import type { SupportedSport } from '@/lib/sport-scope'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'

export const PROFILE_LABELS = [
  'aggressive',
  'conservative',
  'trade-heavy',
  'waiver-focused',
  'quiet strategist',
  'chaos agent',
  'value-first',
  'rookie-heavy',
  'win-now',
  'patient rebuilder',
] as const
export type ProfileLabel = (typeof PROFILE_LABELS)[number]

export const EVIDENCE_TYPES = [
  'draft_tendency',
  'trade_frequency',
  'trade_timing',
  'waiver_activity',
  'lineup_changes',
  'benching_pattern',
  'rookie_vs_veteran',
  'position_priority',
  'rebuild_contention',
  'risk_taking',
] as const
export type EvidenceType = (typeof EVIDENCE_TYPES)[number]

export interface ManagerPsychProfilePayload {
  leagueId: string
  managerId: string
  sport: string
  profileLabels: ProfileLabel[]
  aggressionScore: number
  activityScore: number
  tradeFrequencyScore: number
  waiverFocusScore: number
  riskToleranceScore: number
}

export interface ProfileEvidencePayload {
  managerId: string
  leagueId: string
  sport: string
  evidenceType: EvidenceType
  value: number
  sourceReference?: string | null
  createdAt?: Date
}

export interface BehaviorSignals {
  tradeCount: number
  tradeFrequencyNorm: number
  tradeTimingLateRate: number
  waiverClaimCount: number
  waiverFocusNorm: number
  lineupChangeRate: number
  benchingPatternScore: number
  rookieAcquisitionRate: number
  vetAcquisitionRate: number
  draftPickCount: number
  draftEarlyRoundRate: number
  positionPriorityConcentration: number
  picksTradedAway: number
  picksAcquired: number
  rebuildScore: number
  contentionScore: number
  aggressionNorm: number
  riskNorm: number
}

export const PSYCH_SPORTS: readonly SupportedSport[] = [...SUPPORTED_SPORTS]
export type PsychSport = SupportedSport

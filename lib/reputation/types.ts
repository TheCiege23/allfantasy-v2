/**
 * Phase 6K — Reputation system types.
 *
 * Intentionally kept separate from the manager-level ReputationEngine
 * (lib/reputation-engine) which handles per-league per-season manager trust.
 * This module handles league-level + commissioner-level prestige aggregation.
 */

// ── Tiers ─────────────────────────────────────────────────────────────────────

export const LEAGUE_PRESTIGE_TIERS = [
  'legendary',
  'elite',
  'established',
  'standard',
  'new_league',
  'flagged',
] as const
export type LeaguePrestigeTier = (typeof LEAGUE_PRESTIGE_TIERS)[number]

export const COMMISSIONER_PRESTIGE_TIERS = [
  'legendary',
  'elite',
  'trusted',
  'standard',
  'new_commissioner',
  'flagged',
] as const
export type CommissionerPrestigeTier = (typeof COMMISSIONER_PRESTIGE_TIERS)[number]

// ── Tier thresholds ───────────────────────────────────────────────────────────

/** Minimum overall score (0..1) to reach each tier. */
export const LEAGUE_TIER_THRESHOLDS: Record<LeaguePrestigeTier, number> = {
  legendary:   0.90,
  elite:       0.75,
  established: 0.50,
  standard:    0.25,
  new_league:  0,
  flagged:     -Infinity,
}

export const COMMISSIONER_TIER_THRESHOLDS: Record<CommissionerPrestigeTier, number> = {
  legendary:       0.90,
  elite:           0.75,
  trusted:         0.55,
  standard:        0.30,
  new_commissioner: 0,
  flagged:         -Infinity,
}

// ── Anti-abuse constants ──────────────────────────────────────────────────────

/** Min seasons before prestige tier rises above new_league / new_commissioner. */
export const MIN_SEASONS_FOR_PRESTIGE = 1
/** Score cap when dispute rate exceeds this threshold. */
export const DISPUTE_RATE_CAP_THRESHOLD = 0.15
/** Max score allowed when dispute gate triggers. */
export const DISPUTE_RATE_SCORE_CAP = 0.60
/** Minimum number of evidence data points before a score is surfaced. */
export const MIN_EVIDENCE_SEASONS = 1
/** Max inactivity penalty deduction (never takes score below 0). */
export const MAX_INACTIVITY_PENALTY = 0.25

// ── Score shapes ──────────────────────────────────────────────────────────────

export interface CommissionerPrestigeInputs {
  commissionerId: string
  /** Average commissionerTrustScore from ManagerReputationRecord across all leagues. */
  avgCommissionerTrustScore: number
  /** From CommissionerRecord.reputationScore in resume. */
  resumeReputationScore: number | null
  /** invite accepted / total invites sent. */
  inviteAcceptanceRate: number | null
  /** dispute events / total governance events (lower = better). */
  disputeRate: number | null
  /** Extra penalty for inactivity/abandonment (0 = no penalty). */
  inactivityPenalty: number
  totalLeaguesCommissioned: number
  totalSeasonsCommissioned: number
  activeLeagueCount: number
  verified: boolean
}

export interface LeagueReputationInputs {
  leagueId: string
  /** seasons completed / seasons started */
  completionRate: number | null
  /** avg member retention per season (0..1) */
  retentionRate: number | null
  /** Variance stability: 1 = low variance, 0 = chaotic */
  stabilityScore: number | null
  /** Based on total seasons (saturates at ~5 seasons = 1.0) */
  longevityScore: number | null
  /** Competitiveness: elo spread, avg activity */
  competitivenessScore: number | null
  totalSeasons: number
  abandonedSeasons: number
  verifiedLeague: boolean
}

export interface CommissionerPrestigeRecord {
  id: string
  commissionerId: string
  reliabilityScore: number | null
  fairnessScore: number | null
  inviteAcceptanceRate: number | null
  retentionScore: number | null
  overallScore: number | null
  tier: CommissionerPrestigeTier
  verified: boolean
  totalLeaguesCommissioned: number
  totalSeasonsCommissioned: number
  activeLeagueCount: number
  disputeRate: number | null
  inactivityPenalty: number | null
  lastComputedAt: Date
  updatedAt: Date
}

export interface LeagueReputationRecord {
  id: string
  leagueId: string
  completionRate: number | null
  retentionRate: number | null
  stabilityScore: number | null
  longevityScore: number | null
  competitivenessScore: number | null
  overallScore: number | null
  tier: LeaguePrestigeTier
  verifiedLeague: boolean
  totalSeasons: number
  abandonedSeasons: number
  lastComputedAt: Date
  updatedAt: Date
}

export interface ReputationTelemetryEvent {
  eventKind:
    | 'league_season_completed'
    | 'league_season_abandoned'
    | 'commissioner_invite_accepted'
    | 'commissioner_invite_declined'
    | 'member_retained'
    | 'member_abandoned'
    | 'dispute_filed'
    | 'dispute_resolved'
    | 'commissioner_inactivity_flag'
    | 'league_verified'
    | 'commissioner_verified'
    | 'prestige_computed'
  leagueId?: string | null
  actorId?:  string | null
  targetId?: string | null
  metadata?: Record<string, unknown> | null
}

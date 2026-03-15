/**
 * GM Economy — types for franchise profile, progression events, and career aggregation.
 * Supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 */

/** Event types that drive GM progression and franchise value. */
export const GM_PROGRESSION_EVENT_TYPES = [
  'championship',
  'finals_appearance',
  'playoff_appearance',
  'league_joined',
  'season_completed',
  'reputation_tier_up',
  'legacy_milestone',
  'hall_of_fame_induction',
] as const

export type GMProgressionEventType = (typeof GM_PROGRESSION_EVENT_TYPES)[number]

/** Input for computing/updating a manager's franchise profile. */
export interface ManagerFranchiseProfileInput {
  managerId: string
  totalCareerSeasons: number
  totalLeaguesPlayed: number
  championshipCount: number
  playoffAppearances: number
  careerWinPercentage: number
  gmPrestigeScore: number
  franchiseValue: number
}

/** View model for API/UI. */
export interface ManagerFranchiseProfileView extends ManagerFranchiseProfileInput {
  profileId: string
  updatedAt: Date
  tierLabel?: string
  tierBadgeColor?: string
}

/** Single progression event for timeline. */
export interface GMProgressionEventView {
  eventId: string
  managerId: string
  sport: string
  eventType: string
  valueChange: number
  sourceReference: string | null
  createdAt: Date
}

/** Filters for querying progression events. */
export interface GMProgressionEventFilters {
  managerId: string
  sport?: string | null
  eventType?: string | null
  limit?: number
  offset?: number
}

/** GM tier thresholds (prestige score 0–100 scale). */
export const GM_TIERS = [
  'Legend',
  'Elite',
  'Veteran',
  'Rising',
  'Proven',
  'Developing',
] as const

export type GMTier = (typeof GM_TIERS)[number]

export const GM_TIER_THRESHOLDS: Record<GMTier, { min: number; max?: number }> = {
  Legend: { min: 90 },
  Elite: { min: 75, max: 89 },
  Veteran: { min: 60, max: 74 },
  Rising: { min: 45, max: 59 },
  Proven: { min: 25, max: 44 },
  Developing: { min: 0, max: 24 },
}

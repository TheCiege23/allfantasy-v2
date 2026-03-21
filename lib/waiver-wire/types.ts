/**
 * Waiver wire engine – shared types (multi-sport).
 */

export const WAIVER_TYPES = [
  "faab",
  "rolling",
  "reverse_standings",
  "fcfs",
  "standard",
] as const
export type WaiverType = (typeof WAIVER_TYPES)[number]

export const WAIVER_CLAIM_STATUSES = [
  "pending",
  "processed",
  "failed",
  "cancelled",
] as const
export type WaiverClaimStatus = (typeof WAIVER_CLAIM_STATUSES)[number]

export const TIEBREAK_RULES = [
  "faab_highest",
  "priority_lowest_first",
  "reverse_standings",
  "earliest_claim",
] as const
export type TiebreakRule = (typeof TIEBREAK_RULES)[number]

export type LeagueWaiverSettingsInput = {
  waiverType?: WaiverType | string
  processingDayOfWeek?: number | null
  processingTimeUtc?: string | null
  claimLimitPerPeriod?: number | null
  faabBudget?: number | null
  faabResetDate?: string | Date | null
  tiebreakRule?: TiebreakRule | string | null
  lockType?: string | null
  instantFaAfterClear?: boolean
}

export type WaiverClaimInput = {
  addPlayerId: string
  dropPlayerId?: string | null
  faabBid?: number | null
  priorityOrder?: number
}

export type ProcessedClaimResult = {
  claimId: string
  rosterId: string
  success: boolean
  addPlayerId: string
  dropPlayerId?: string | null
  faabSpent?: number | null
  message?: string
}

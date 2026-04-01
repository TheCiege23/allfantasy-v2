/**
 * Merged Devy / C2C (College to Canton) types. PROMPT 2/6.
 * Sport adapters: nfl_c2c (NFL/NCAAF + NCAA Football), nba_c2c (NBA/NCAAB + NCAA Basketball).
 */

import type { LeagueSport } from '@prisma/client'

export const MERGED_DEVY_C2C_VARIANT = 'merged_devy_c2c'

export type C2CSportAdapterId = 'nfl_c2c' | 'nba_c2c'

export function getC2CAdapterForSport(sport: LeagueSport | string): C2CSportAdapterId | null {
  const s = String(sport).toUpperCase()
  if (s === 'NFL' || s === 'NCAAF') return 'nfl_c2c'
  if (s === 'NBA' || s === 'NCAAB') return 'nba_c2c'
  return null
}

export type StartupFormat = 'merged' | 'separate'
export type StandingsModel = 'unified' | 'separate' | 'hybrid'
export type C2CDraftPhase = 'startup_pro' | 'startup_college' | 'startup_merged' | 'rookie' | 'college' | 'merged_rookie_college'

export interface C2CFormatCapabilities {
  dynastyOnly: boolean
  supportsMergedCollegeAndProAssets: boolean
  supportsCollegeScoring: boolean
  supportsBestBall: boolean
  supportsSnakeDraft: boolean
  supportsLinearDraft: boolean
  supportsTaxi: boolean
  supportsFuturePicks: boolean
  supportsTradeableCollegeAssets: boolean
  supportsTradeableCollegePicks: boolean
  supportsTradeableRookiePicks: boolean
  supportsPromotionRules: boolean
}

export interface C2CCommissionerSettings {
  startupFormat: StartupFormat
  mergedStartupDraft: boolean
  separateStartupCollegeDraft: boolean
  collegeRosterSize: number
  collegeSports: string[]
  collegeScoringSystem: string
  mixProPlayers: boolean
  collegeActiveLineupSlots: C2CLineupSlots
  taxiSize: number
  rookieDraftRounds: number
  collegeDraftRounds: number
  bestBallPro: boolean
  bestBallCollege: boolean
  promotionTiming: string
  maxPromotionsPerYear: number | null
  earlyDeclareBehavior: string
  returnToSchoolHandling: string
  rookiePickTradeRules: string
  collegePickTradeRules: string
  collegeScoringUntilDeadline: boolean
  standingsModel: StandingsModel
  mergedRookieCollegeDraft: boolean
  nflCollegeExcludeKDST: boolean
  proLineupSlots: C2CLineupSlots | null
  proBenchSize: number
  proIRSize: number
  startupDraftType: 'snake' | 'linear'
  rookieDraftType: 'snake' | 'linear'
  collegeDraftType: 'snake' | 'linear'
  rookiePickOrderMethod: string
  collegePickOrderMethod: string
  /** PROMPT 3: Hybrid championship. */
  hybridProWeight?: number
  hybridPlayoffQualification?: string
  hybridChampionshipTieBreaker?: string
  collegeFAEnabled?: boolean
  collegeFAABSeparate?: boolean
  collegeFAABBudget?: number | null
}

/** NFL: qb, rb, wr, te, flex, superflex. NBA: g, f, c, flex. */
export type C2CLineupSlots = Record<string, number>

export interface C2CLeagueConfigShape extends C2CFormatCapabilities, C2CCommissionerSettings {
  leagueId: string
  sport: LeagueSport
  sportAdapterId: C2CSportAdapterId | null
}

export interface C2CEligibilityResult {
  eligible: boolean
  reason?: string
  isCollege: boolean
  isPro: boolean
  isGraduated: boolean
  positionEligible: boolean
  poolSource: 'pro' | 'college'
}

export interface C2CRosterLegalityResult {
  legal: boolean
  errors: string[]
  warnings: string[]
  proSlotsUsed?: number
  collegeSlotsUsed?: number
}

export type C2CPoolType = 'startup_pro' | 'startup_college' | 'startup_merged' | 'rookie' | 'college' | 'merged_rookie_college'

// ========== PROMPT 3: Asset lifecycle states ==========
/** Persisted on DevyRights.state for C2C leagues. Align with devy where overlapping. */
export const C2C_LIFECYCLE_STATE = {
  COLLEGE_ACTIVE: 'COLLEGE_ACTIVE',
  COLLEGE_STARTER: 'COLLEGE_STARTER',
  COLLEGE_BENCH: 'COLLEGE_BENCH',
  COLLEGE_BESTBALL_ELIGIBLE: 'COLLEGE_BESTBALL_ELIGIBLE',
  DECLARED: 'DECLARED',
  DRAFTED_RIGHTS_HELD: 'DRAFTED_RIGHTS_HELD',
  PROMOTION_ELIGIBLE: 'PROMOTION_ELIGIBLE',
  PROMOTED_TO_PRO: 'PROMOTED_TO_PRO',
  RETURNED_TO_SCHOOL: 'RETURNED_TO_SCHOOL',
  ROOKIE_POOL_ELIGIBLE: 'ROOKIE_POOL_ELIGIBLE',
  ROOKIE_POOL_EXCLUDED: 'ROOKIE_POOL_EXCLUDED',
  TAXI_PRO: 'TAXI_PRO',
  TAXI_COLLEGE: 'TAXI_COLLEGE',
  ORPHANED_RIGHTS: 'ORPHANED_RIGHTS',
  RIGHTS_EXPIRED: 'RIGHTS_EXPIRED',
  /** C2C uses same DB state as devy for compatibility; map to devy names where stored */
  NCAA_DEVY_ACTIVE: 'NCAA_DEVY_ACTIVE',
} as const

export type C2CLifecycleState = (typeof C2C_LIFECYCLE_STATE)[keyof typeof C2C_LIFECYCLE_STATE]

/** Promotion timing options for C2C. */
export type C2CPromotionTiming =
  | 'immediate_after_pro_draft'
  | 'rollover'
  | 'manager_choice_before_rookie_draft'

/** Hybrid standings config. */
export interface C2CHybridStandingsConfig {
  proWeight: number
  collegeWeight: number
  playoffQualification: 'pro_only' | 'college_only' | 'combined' | 'weighted'
  championshipTieBreaker: 'pro_first' | 'college_first' | 'total_points' | 'head_to_head'
}

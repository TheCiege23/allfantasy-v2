/**
 * Devy Dynasty league types. PROMPT 2/6.
 * Sport adapters: nfl_devy (NFL/NCAAF → NCAA Football), nba_devy (NBA/NCAAB → NCAA Basketball).
 */

import type { LeagueSport } from '@prisma/client'

/** League subtype for specialty registry. */
export const DEVY_DYNASTY_VARIANT = 'devy_dynasty'

/** PROMPT 3: When to apply promotion after pro draft. */
export type PromotionTiming =
  | 'immediate_after_pro_draft'
  | 'rollover'
  | 'manager_choice_before_rookie_draft'

/** Sport adapter ids used to resolve eligibility and pool by League.sport. */
export type DevySportAdapterId = 'nfl_devy' | 'nba_devy'

/** Map League.sport to devy adapter. */
export function getDevyAdapterForSport(sport: LeagueSport | string): DevySportAdapterId | null {
  const s = String(sport).toUpperCase()
  if (s === 'NFL' || s === 'NCAAF') return 'nfl_devy'
  if (s === 'NBA' || s === 'NCAAB') return 'nba_devy'
  return null
}

/** Format capability flags (stored in config; all true for devy_dynasty). */
export interface DevyFormatCapabilities {
  dynastyOnly: boolean
  supportsStartupVetDraft: boolean
  supportsRookieDraft: boolean
  supportsDevyDraft: boolean
  supportsBestBall: boolean
  supportsSnakeDraft: boolean
  supportsLinearDraft: boolean
  supportsTaxi: boolean
  supportsFuturePicks: boolean
  supportsTradeableDevyPicks: boolean
  supportsTradeableRookiePicks: boolean
}

/** Commissioner-controlled settings. */
export interface DevyCommissionerSettings {
  devySlotCount: number
  devyIRSlots: number
  taxiSize: number
  devyScoringEnabled: boolean
  collegeSports: string[]
  rookieDraftRounds: number
  devyDraftRounds: number
  startupVetRounds: number | null
  bestBallEnabled: boolean
  startupDraftType: 'snake' | 'linear'
  rookieDraftType: 'snake' | 'linear'
  devyDraftType: 'snake' | 'linear'
  maxYearlyDevyPromotions: number | null
  earlyDeclareBehavior: 'allow' | 'block' | 'commissioner'
  rookiePickOrderMethod: 'reverse_standings' | 'lottery' | 'consolation' | 'custom'
  devyPickOrderMethod: 'reverse_standings' | 'lottery' | 'consolation' | 'custom'
  devyPickTradeRules: 'allowed' | 'locked_until_draft' | 'commissioner_only'
  rookiePickTradeRules: 'allowed' | 'locked_until_draft' | 'commissioner_only'
  nflDevyExcludeKDST: boolean
  /** PROMPT 3: When to apply promotion. */
  promotionTiming: PromotionTiming
  supplementalDevyFAEnabled: boolean
  rightsExpirationEnabled: boolean
  /** PROMPT 3: When player returns to school: restore_rights | hold_rights | commissioner. */
  returnToSchoolHandling: 'restore_rights' | 'hold_rights' | 'commissioner'
  /** PROMPT 4: Taxi-eligible pro rookies count toward best ball when true. */
  taxiProRookiesScoreInBestBall: boolean
  /** PROMPT 4: NFL best ball superflex slot. */
  bestBallSuperflex: boolean
}

/** Full devy league config (loader return type). */
export interface DevyLeagueConfigShape extends DevyFormatCapabilities, DevyCommissionerSettings {
  leagueId: string
  sport: LeagueSport
  sportAdapterId: DevySportAdapterId | null
}

/** Draft phase for three-draft system. */
export type DevyDraftPhase = 'startup_vet' | 'rookie' | 'devy'

/** Pick order method for rookie/devy drafts. */
export type DevyPickOrderMethod = 'reverse_standings' | 'lottery' | 'consolation' | 'custom'

/** Eligibility result for a player in devy context. */
export interface DevyEligibilityResult {
  eligible: boolean
  reason?: string
  isDevy: boolean
  isGraduated: boolean
  positionEligible: boolean
  poolSource: 'pro' | 'college'
}

/** Contract for sport-specific devy eligibility adapter. */
export interface DevyEligibilityAdapter {
  adapterId: DevySportAdapterId
  /** Eligible positions in the devy (college) pool for this sport. */
  devyEligiblePositions: string[]
  /** Check if a position is eligible for devy pool (e.g. QB,RB,WR,TE for NFL; G,F,C for NBA). */
  isDevyPositionEligible(position: string): boolean
  /** Optional: map combo tags to positions (e.g. PG/SG -> G for NBA). */
  mapPositionToDevyPosition?(position: string): string
}

// ========== PROMPT 3: Lifecycle states ==========

export const DEVY_LIFECYCLE_STATE = {
  NCAA_DEVY_ACTIVE: 'NCAA_DEVY_ACTIVE',
  NCAA_DEVY_TAXI: 'NCAA_DEVY_TAXI',
  NCAA_DEVY_LOCKED: 'NCAA_DEVY_LOCKED',
  DECLARED: 'DECLARED',
  DRAFTED_RIGHTS_HELD: 'DRAFTED_RIGHTS_HELD',
  PROMOTION_ELIGIBLE: 'PROMOTION_ELIGIBLE',
  PROMOTED_TO_PRO: 'PROMOTED_TO_PRO',
  RETURNED_TO_SCHOOL: 'RETURNED_TO_SCHOOL',
  RIGHTS_EXPIRED: 'RIGHTS_EXPIRED',
  ORPHANED_RIGHTS: 'ORPHANED_RIGHTS',
} as const

export type DevyLifecycleState = (typeof DEVY_LIFECYCLE_STATE)[keyof typeof DEVY_LIFECYCLE_STATE]

// ========== PROMPT 3: Tradeable asset types (devy/rookie/vet picks) ==========

export const DEVY_ASSET_TYPE = {
  DEVY_PLAYER: 'DEVY_PLAYER',
  DEVY_PICK: 'DEVY_PICK',
  ROOKIE_PICK: 'ROOKIE_PICK',
  VET_PICK: 'VET_PICK',
  FUTURE_DEVY_PICK: 'FUTURE_DEVY_PICK',
  FUTURE_ROOKIE_PICK: 'FUTURE_ROOKIE_PICK',
} as const

export type DevyAssetType = (typeof DEVY_ASSET_TYPE)[keyof typeof DEVY_ASSET_TYPE]

/**
 * Devy Dynasty league types. PROMPT 2/6.
 * Sport adapters: nfl_devy (NFL → NCAA Football), nba_devy (NBA → NCAA Basketball).
 */

import type { LeagueSport } from '@prisma/client'

/** League subtype for specialty registry. */
export const DEVY_DYNASTY_VARIANT = 'devy_dynasty'

/** Sport adapter ids used to resolve eligibility and pool by League.sport. */
export type DevySportAdapterId = 'nfl_devy' | 'nba_devy'

/** Map League.sport to devy adapter. */
export function getDevyAdapterForSport(sport: LeagueSport | string): DevySportAdapterId | null {
  const s = String(sport).toUpperCase()
  if (s === 'NFL') return 'nfl_devy'
  if (s === 'NBA') return 'nba_devy'
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
  taxiSize: number
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

/**
 * Normalized internal models for draft ecosystem (live, mock, auction, slow, keeper, devy, C2C).
 * Sport-aware; do not assume one sport.
 * Supported: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 */

import type { LeagueSport } from '@prisma/client'

export type DraftSport = LeagueSport

/** Team display for logos and abbreviations (normalized from any provider). */
export interface TeamDisplayModel {
  teamId: string
  abbreviation: string
  displayName: string
  sport: DraftSport
  logoUrl: string | null
  /** Fallback used when logoUrl failed or missing */
  logoFallbackUsed?: boolean
}

/** Player assets (images) with fallbacks. */
export interface PlayerAssetModel {
  headshotUrl: string | null
  teamLogoUrl: string | null
  /** Optional explicit fallback URL when headshotUrl is missing. */
  headshotFallbackUrl?: string | null
  /** Optional explicit fallback URL when teamLogoUrl is missing. */
  teamLogoFallbackUrl?: string | null
  /** True when headshot is fallback (initial, placeholder) */
  headshotFallbackUsed?: boolean
  /** True when team logo is fallback */
  teamLogoFallbackUsed?: boolean
}

/** Key stat summary for draft panels (sport-appropriate). */
export interface PlayerStatSnapshotModel {
  /** e.g. "ADP 12" or "PPG 22.1" */
  primaryStatLabel?: string | null
  primaryStatValue?: number | null
  /** Optional secondary (e.g. "Bye 7") */
  secondaryStatLabel?: string | null
  secondaryStatValue?: number | null
  /** Raw for tooltips/sort */
  adp?: number | null
  byeWeek?: number | null
}

/** Draft-specific metadata (eligibility, injury, devy/C2C). */
export interface PlayerDraftMetadataModel {
  position: string
  /** Secondary positions if applicable (e.g. WR/TE) */
  secondaryPositions?: string[]
  /** Position eligibility tokens for roster-slot matching and filters. */
  positionEligibility?: string[]
  teamAbbreviation: string | null
  /** Team affiliation label (e.g. "KC", "Ohio State"). */
  teamAffiliation?: string | null
  byeWeek: number | null
  injuryStatus: string | null
  /** College or pipeline marker for devy/C2C */
  collegeOrPipeline?: string | null
  /** Eligibility note (e.g. "Rookie") */
  eligibilityNote?: string | null
  classYearLabel?: string | null
  draftGrade?: string | null
  projectedLandingSpot?: string | null
  sport: DraftSport
}

/** Full normalized player for draft UIs (live, mock, auction, slow, keeper, devy, C2C). */
export interface PlayerDisplayModel {
  playerId: string
  displayName: string
  sport: DraftSport
  assets: PlayerAssetModel
  team: TeamDisplayModel | null
  stats: PlayerStatSnapshotModel
  metadata: PlayerDraftMetadataModel
}

/** Normalized draft pool entry: display model + draft-specific fields (ADP, etc.). */
export interface NormalizedDraftEntry {
  display: PlayerDisplayModel
  /** For compatibility with existing PlayerEntry-style consumers */
  name: string
  position: string
  team: string | null
  adp?: number | null
  byeWeek?: number | null
  playerId?: string | null
  /** AI ADP when available */
  aiAdp?: number | null
  aiAdpSampleSize?: number
  aiAdpLowSample?: boolean
  injuryStatus?: string | null
  collegeOrPipeline?: string | null
  /** Devy: true when player is from devy/college pool */
  isDevy?: boolean
  /** Devy: school (e.g. "Ohio State") */
  school?: string | null
  classYearLabel?: string | null
  draftGrade?: string | null
  projectedLandingSpot?: string | null
  /** Devy: draft-eligible year */
  draftEligibleYear?: number | null
  /** Devy: true when player has graduated to NFL (promotion pipeline) */
  graduatedToNFL?: boolean
  /** C2C: explicit pool for Campus-to-Canton (college vs pro) */
  poolType?: 'college' | 'pro'
}

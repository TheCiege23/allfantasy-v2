/**
 * Creator League System (PROMPT 141) — types.
 * Supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 */

import type { LeagueSport } from '@prisma/client'

export const CREATOR_LEAGUE_SPORTS: LeagueSport[] = [
  'NFL',
  'NHL',
  'NBA',
  'MLB',
  'NCAAF',
  'NCAAB',
  'SOCCER',
]

export type CreatorVisibility = 'public' | 'unlisted' | 'private'
export type CreatorLeagueType = 'FANTASY' | 'BRACKET'

export interface CreatorBranding {
  logoUrl?: string | null
  primaryColor?: string | null
  accentColor?: string | null
}

export interface CreatorSocialHandles {
  twitter?: string | null
  youtube?: string | null
  twitch?: string | null
  instagram?: string | null
}

export interface CreatorProfileDto {
  id: string
  userId: string
  handle: string
  slug: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  bannerUrl: string | null
  websiteUrl: string | null
  socialHandles: CreatorSocialHandles | null
  isVerified: boolean
  verificationBadge: string | null
  visibility: string
  branding: CreatorBranding | null
  followerCount?: number
  leagueCount?: number
  isFollowing?: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatorLeagueDto {
  id: string
  creatorId: string
  type: string
  leagueId: string | null
  bracketLeagueId: string | null
  name: string
  slug: string
  description: string | null
  sport: string
  inviteCode: string
  inviteUrl: string
  isPublic: boolean
  maxMembers: number
  memberCount: number
  joinDeadline: string | null
  creator?: CreatorProfileDto | null
  isMember?: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatorAnalyticsSummaryDto {
  profileViews: number
  followCount: number
  leagueJoins: number
  inviteShares: number
  period: string
}

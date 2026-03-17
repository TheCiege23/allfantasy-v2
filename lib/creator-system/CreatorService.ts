/**
 * Creator League System (PROMPT 141) — service layer.
 * Full CRUD, branding, invites, follow, join, analytics, share URLs.
 */

import { prisma } from '@/lib/prisma'
import { isSupportedSport } from '@/lib/sport-scope'
import type { CreatorBranding, CreatorSocialHandles } from './types'

const CREATOR_ANALYTICS_EVENTS = [
  'profile_view',
  'follow',
  'league_join',
  'invite_share',
] as const
type CreatorAnalyticsEventType = (typeof CREATOR_ANALYTICS_EVENTS)[number]

function toDto(profile: {
  id: string
  userId: string
  handle: string
  slug: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  bannerUrl: string | null
  websiteUrl: string | null
  socialHandles: unknown
  verifiedAt: Date | null
  verificationBadge: string | null
  visibility: string
  branding: unknown
  createdAt: Date
  updatedAt: Date
  _count?: { leagues?: number }
  followers?: number
  isFollowing?: boolean
}) {
  return {
    id: profile.id,
    userId: profile.userId,
    handle: profile.handle,
    slug: profile.slug,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    bannerUrl: profile.bannerUrl,
    websiteUrl: profile.websiteUrl,
    socialHandles: (profile.socialHandles as CreatorSocialHandles) ?? null,
    isVerified: !!profile.verifiedAt,
    verificationBadge: profile.verificationBadge,
    visibility: profile.visibility,
    branding: (profile.branding as CreatorBranding) ?? null,
    followerCount: profile.followers ?? profile._count?.leagues,
    leagueCount: profile._count?.leagues,
    isFollowing: profile.isFollowing,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  }
}

function leagueToDto(
  league: {
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
    isPublic: boolean
    maxMembers: number
    memberCount: number
    joinDeadline: Date | null
    createdAt: Date
    updatedAt: Date
    creator?: unknown
    isMember?: boolean
  },
  baseUrl: string
) {
  return {
    ...league,
    inviteUrl: `${baseUrl}/join?code=${league.inviteCode}`,
    creator: league.creator ? toDto(league.creator as Parameters<typeof toDto>[0]) : null,
    createdAt: league.createdAt.toISOString(),
    updatedAt: league.updatedAt.toISOString(),
    joinDeadline: league.joinDeadline?.toISOString() ?? null,
  }
}

export async function getCreators(options: {
  visibility?: 'public' | 'unlisted' | 'all'
  sport?: string
  limit?: number
  cursor?: string
}) {
  const { visibility = 'public', sport, limit = 24, cursor } = options
  const where: { visibility?: string; leagues?: { some?: { sport?: string } } } = {}
  if (visibility === 'public') where.visibility = 'public'
  else if (visibility === 'unlisted') where.visibility = 'unlisted'
  if (sport && isSupportedSport(sport)) {
    where.leagues = { some: { sport: sport.toUpperCase() } }
  }

  const profiles = await prisma.creatorProfile.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { leagues: true } },
    },
  })

  const nextCursor = profiles.length > limit ? profiles[limit - 1]!.id : null
  const list = profiles.slice(0, limit)

  const withFollowers = await Promise.all(
    list.map(async (p) => {
      const followers = await prisma.userFollow.count({
        where: { followeeId: p.userId },
      })
      return { ...p, followers }
    })
  )

  return {
    creators: withFollowers.map((p) => toDto(p)),
    nextCursor,
  }
}

export async function getCreatorBySlugOrId(creatorIdOrSlug: string, viewerUserId?: string | null) {
  const isSlug = !/^[0-9a-f-]{36}$/i.test(creatorIdOrSlug)
  const profile = await prisma.creatorProfile.findFirst({
    where: isSlug ? { slug: creatorIdOrSlug } : { id: creatorIdOrSlug },
    include: {
      _count: { select: { leagues: true } },
    },
  })
  if (!profile) return null
  if (profile.visibility === 'private' && profile.userId !== viewerUserId) return null

  const followers = await prisma.userFollow.count({
    where: { followeeId: profile.userId },
  })
  let isFollowing = false
  if (viewerUserId) {
    const follow = await prisma.userFollow.findUnique({
      where: {
        followerId_followeeId: { followerId: viewerUserId, followeeId: profile.userId },
      },
    })
    isFollowing = !!follow
  }
  return toDto({ ...profile, followers, isFollowing })
}

export async function getCreatorLeagues(creatorId: string, viewerUserId?: string | null, baseUrl = '') {
  const creator = await prisma.creatorProfile.findUnique({
    where: { id: creatorId },
    select: { id: true, visibility: true, userId: true },
  })
  if (!creator) return []
  if (creator.visibility === 'private' && creator.userId !== viewerUserId) return []

  const leagues = await prisma.creatorLeague.findMany({
    where: { creatorId },
    orderBy: { updatedAt: 'desc' },
    include: { creator: true },
  })

  const withMembership = await Promise.all(
    leagues.map(async (l) => {
      let isMember = false
      if (viewerUserId) {
        const m = await prisma.creatorLeagueMember.findUnique({
          where: {
            creatorLeagueId_userId: { creatorLeagueId: l.id, userId: viewerUserId },
          },
        })
        isMember = !!m
      }
      return { ...l, isMember }
    })
  )

  return withMembership.map((l) => leagueToDto(l, baseUrl))
}

export async function updateCreatorBranding(creatorProfileId: string, userId: string, branding: CreatorBranding) {
  const profile = await prisma.creatorProfile.findFirst({
    where: { id: creatorProfileId, userId },
  })
  if (!profile) return null
  const updated = await prisma.creatorProfile.update({
    where: { id: creatorProfileId },
    data: { branding: branding as object },
  })
  return toDto(updated)
}

export async function createInvite(creatorId: string, userId: string, creatorLeagueId?: string | null) {
  const profile = await prisma.creatorProfile.findFirst({
    where: { id: creatorId, userId },
  })
  if (!profile) return null
  const code = generateInviteCode()
  const invite = await prisma.creatorInvite.create({
    data: {
      creatorId,
      creatorLeagueId: creatorLeagueId || null,
      code,
    },
  })
  return invite
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export async function joinByInviteCode(code: string, userId: string) {
  const invite = await prisma.creatorInvite.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: { league: true },
  })
  if (!invite) return { success: false, error: 'Invalid invite code' }
  if (invite.expiresAt && invite.expiresAt < new Date()) return { success: false, error: 'Invite expired' }
  if (invite.maxUses > 0 && invite.useCount >= invite.maxUses) return { success: false, error: 'Invite limit reached' }

  if (invite.creatorLeagueId && invite.league) {
    const league = invite.league
    const existing = await prisma.creatorLeagueMember.findUnique({
      where: {
        creatorLeagueId_userId: { creatorLeagueId: league.id, userId },
      },
    })
    if (existing) return { success: true, creatorLeagueId: league.id, alreadyMember: true }

    if (league.maxMembers > 0 && league.memberCount >= league.maxMembers)
      return { success: false, error: 'League is full' }
    if (league.joinDeadline && league.joinDeadline < new Date()) return { success: false, error: 'Join deadline passed' }

    await prisma.$transaction([
      prisma.creatorLeagueMember.create({
        data: {
          creatorLeagueId: league.id,
          userId,
          joinedViaCode: invite.code,
        },
      }),
      prisma.creatorLeague.update({
        where: { id: league.id },
        data: { memberCount: { increment: 1 } },
      }),
      prisma.creatorInvite.update({
        where: { id: invite.id },
        data: { useCount: { increment: 1 } },
      }),
    ])
    await logAnalytics(invite.creatorId, 'league_join', league.id, { inviteCode: invite.code })
    return { success: true, creatorLeagueId: league.id }
  }

  await prisma.creatorInvite.update({
    where: { id: invite.id },
    data: { useCount: { increment: 1 } },
  })
  return { success: true, creatorLeagueId: null }
}

export async function followCreator(creatorProfileId: string, followerUserId: string) {
  const profile = await prisma.creatorProfile.findUnique({
    where: { id: creatorProfileId },
    select: { userId: true },
  })
  if (!profile) return { success: false, error: 'Creator not found' }
  if (profile.userId === followerUserId) return { success: false, error: 'Cannot follow yourself' }

  await prisma.userFollow.upsert({
    where: {
      followerId_followeeId: { followerId: followerUserId, followeeId: profile.userId },
    },
    create: { followerId: followerUserId, followeeId: profile.userId },
    update: {},
  })
  await logAnalytics(creatorProfileId, 'follow', null, {})
  return { success: true }
}

export async function unfollowCreator(creatorProfileId: string, followerUserId: string) {
  const profile = await prisma.creatorProfile.findUnique({
    where: { id: creatorProfileId },
    select: { userId: true },
  })
  if (!profile) return { success: false, error: 'Creator not found' }

  await prisma.userFollow.deleteMany({
    where: {
      followerId: followerUserId,
      followeeId: profile.userId,
    },
  })
  return { success: true }
}

export async function getCreatorLeagueByInviteCode(code: string) {
  const invite = await prisma.creatorInvite.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: { league: { include: { creator: true } }, creator: true },
  })
  if (!invite?.league) return null
  return leagueToDto(
    { ...invite.league, creator: invite.league.creator, isMember: undefined },
    typeof window !== 'undefined' ? window.location.origin : ''
  )
}

export function buildShareUrl(creatorSlug: string, baseUrl: string): string {
  return `${baseUrl}/creators/${creatorSlug}`
}

export function buildLeagueShareUrl(creatorLeagueId: string, inviteCode: string, baseUrl: string): string {
  return `${baseUrl}/creator/leagues/${creatorLeagueId}?join=${inviteCode}`
}

export async function logAnalytics(
  creatorId: string,
  eventType: CreatorAnalyticsEventType,
  leagueId?: string | null,
  metadata?: Record<string, unknown>
) {
  if (!CREATOR_ANALYTICS_EVENTS.includes(eventType)) return
  await prisma.creatorAnalyticsEvent.create({
    data: {
      creatorId,
      eventType,
      leagueId: leagueId ?? null,
      metadata: (metadata ?? {}) as object,
    },
  })
}

export async function getCreatorAnalyticsSummary(creatorId: string, userId: string, periodDays = 30) {
  const profile = await prisma.creatorProfile.findFirst({
    where: { id: creatorId, userId },
  })
  if (!profile) return null

  const since = new Date()
  since.setDate(since.getDate() - periodDays)

  const events = await prisma.creatorAnalyticsEvent.findMany({
    where: { creatorId, createdAt: { gte: since } },
    select: { eventType: true },
  })

  const profileViews = events.filter((e) => e.eventType === 'profile_view').length
  const followCount = events.filter((e) => e.eventType === 'follow').length
  const leagueJoins = events.filter((e) => e.eventType === 'league_join').length
  const inviteShares = events.filter((e) => e.eventType === 'invite_share').length

  const totalFollowers = await prisma.userFollow.count({
    where: { followeeId: profile.userId },
  })

  return {
    profileViews,
    followCount: totalFollowers,
    leagueJoins,
    inviteShares,
    period: `${periodDays}d`,
  }
}

export async function getCreatorLeagueById(creatorLeagueId: string, viewerUserId?: string | null, baseUrl = '') {
  const league = await prisma.creatorLeague.findUnique({
    where: { id: creatorLeagueId },
    include: { creator: true },
  })
  if (!league) return null
  if (league.creator.visibility === 'private' && league.creator.userId !== viewerUserId) return null

  let isMember = false
  if (viewerUserId) {
    const m = await prisma.creatorLeagueMember.findUnique({
      where: {
        creatorLeagueId_userId: { creatorLeagueId: league.id, userId: viewerUserId },
      },
    })
    isMember = !!m
  }
  return leagueToDto({ ...league, isMember }, baseUrl)
}

export async function ensureCreatorProfile(userId: string, handle: string) {
  const slug = handle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  let profile = await prisma.creatorProfile.findUnique({
    where: { userId },
  })
  if (profile) return profile
  let uniqueSlug = slug
  let n = 0
  while (await prisma.creatorProfile.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${++n}`
  }
  profile = await prisma.creatorProfile.create({
    data: {
      userId,
      handle,
      slug: uniqueSlug,
      displayName: handle,
    },
  })
  return profile
}

import { prisma } from '@/lib/prisma'
import { clampCareerTier } from '@/lib/ranking/tier-visibility'

type PrismaLike = Pick<typeof prisma, 'findLeagueListing' | 'userProfile' | 'leagueInvite'>

export type ResolveJoinRankGateInput = {
  leagueId: string
  inviteTokenOrCode?: string | null
  userId: string
  prismaLike?: PrismaLike
}

export type ResolveJoinRankGateResult = {
  allowed: boolean
  bypassed: boolean
  userRankLevel: number
  minRankLevel: number | null
  maxRankLevel: number | null
  reason?: 'LISTING_MISSING' | 'RANGE_NOT_CONFIGURED' | 'RANGE_OK' | 'BYPASS_INVITE' | 'OUTSIDE_RANK_RANGE'
}

function resolveUserRankLevel(input: { xpLevel?: number | null; legacyCareerLevel?: number | null }): number {
  const raw = Number(input.xpLevel ?? input.legacyCareerLevel ?? 1)
  const normalized = Number.isFinite(raw) ? Math.floor(raw) : 1
  return clampCareerTier(normalized, 1)
}

function hasInviteExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return false
  return expiresAt.getTime() < Date.now()
}

export async function resolveJoinRankGate(input: ResolveJoinRankGateInput): Promise<ResolveJoinRankGateResult> {
  const prismaClient = input.prismaLike ?? prisma
  const inviteTokenOrCode = input.inviteTokenOrCode?.trim() ?? ''

  const [listing, profile] = await Promise.all([
    prismaClient.findLeagueListing.findFirst({
      where: { leagueId: input.leagueId },
      select: {
        creatorRankLevel: true,
        minRankLevel: true,
        maxRankLevel: true,
      },
    }),
    prismaClient.userProfile.findUnique({
      where: { userId: input.userId },
      select: { xpLevel: true, legacyCareerLevel: true },
    }),
  ])

  const userRankLevel = resolveUserRankLevel({
    xpLevel: profile?.xpLevel,
    legacyCareerLevel: profile?.legacyCareerLevel,
  })

  if (!listing) {
    return {
      allowed: true,
      bypassed: false,
      userRankLevel,
      minRankLevel: null,
      maxRankLevel: null,
      reason: 'LISTING_MISSING',
    }
  }

  const minRankLevel =
    listing.minRankLevel == null ? null : clampCareerTier(Math.floor(listing.minRankLevel), 1)
  const maxRankLevel =
    listing.maxRankLevel == null ? null : clampCareerTier(Math.floor(listing.maxRankLevel), 1)

  if (minRankLevel == null || maxRankLevel == null || minRankLevel > maxRankLevel) {
    return {
      allowed: true,
      bypassed: false,
      userRankLevel,
      minRankLevel,
      maxRankLevel,
      reason: 'RANGE_NOT_CONFIGURED',
    }
  }

  const withinRange = userRankLevel >= minRankLevel && userRankLevel <= maxRankLevel
  if (withinRange) {
    return {
      allowed: true,
      bypassed: false,
      userRankLevel,
      minRankLevel,
      maxRankLevel,
      reason: 'RANGE_OK',
    }
  }

  if (inviteTokenOrCode) {
    const bypassInvite = await prismaClient.leagueInvite.findFirst({
      where: {
        leagueId: input.leagueId,
        token: inviteTokenOrCode,
        isActive: true,
      },
      select: {
        bypassRankGate: true,
        useCount: true,
        maxUses: true,
        expiresAt: true,
      },
    })

    const inviteUsable =
      Boolean(bypassInvite) &&
      !hasInviteExpired(bypassInvite?.expiresAt) &&
      (bypassInvite?.maxUses ?? 0) > (bypassInvite?.useCount ?? 0)

    if (inviteUsable && bypassInvite?.bypassRankGate) {
      return {
        allowed: true,
        bypassed: true,
        userRankLevel,
        minRankLevel,
        maxRankLevel,
        reason: 'BYPASS_INVITE',
      }
    }
  }

  return {
    allowed: false,
    bypassed: false,
    userRankLevel,
    minRankLevel,
    maxRankLevel,
    reason: 'OUTSIDE_RANK_RANGE',
  }
}
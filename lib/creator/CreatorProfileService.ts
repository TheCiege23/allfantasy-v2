/**
 * CreatorProfileService — verified creator profiles and lookup.
 */

import { prisma } from "@/lib/prisma"

export interface CreatorProfilePublic {
  userId: string
  handle: string
  displayName: string | null
  avatarUrl: string | null
  verified: boolean
  leagueCount: number
  totalMembers: number
}

export async function getCreatorByUserId(userId: string): Promise<CreatorProfilePublic | null> {
  const creator = await prisma.creatorProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  })
  if (!creator) return null

  const [leagueCount, totalMembers] = await Promise.all([
    prisma.bracketLeague.count({ where: { ownerId: userId } }),
    prisma.bracketLeagueMember.count({
      where: { league: { ownerId: userId } },
    }),
  ])

  return {
    userId: creator.userId,
    handle: creator.handle,
    displayName: creator.user.displayName ?? null,
    avatarUrl: creator.user.avatarUrl ?? null,
    verified: !!creator.verifiedAt,
    leagueCount,
    totalMembers,
  }
}

export async function getCreatorByHandle(handle: string): Promise<CreatorProfilePublic | null> {
  const creator = await prisma.creatorProfile.findUnique({
    where: { handle: normalizeHandle(handle) },
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  })
  if (!creator) return null
  return getCreatorByUserId(creator.userId)
}

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "").slice(0, 64) || "creator"
}

export async function isVerifiedCreator(userId: string): Promise<boolean> {
  const c = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { verifiedAt: true },
  })
  return !!c?.verifiedAt
}

export interface CreatorLeaderboardEntry {
  userId: string
  handle: string
  displayName: string | null
  avatarUrl: string | null
  verified: boolean
  leagueCount: number
  totalMembers: number
  rank: number
}

export async function listCreatorsLeaderboard(opts?: {
  limit?: number
  sort?: "leagues" | "members"
}): Promise<CreatorLeaderboardEntry[]> {
  const limit = Math.min(50, Math.max(1, opts?.limit ?? 20))
  const sort = opts?.sort ?? "members"

  const creators = await prisma.creatorProfile.findMany({
    where: { verifiedAt: { not: null } },
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true } },
    },
    take: limit * 3,
  })

  const withCounts = await Promise.all(
    creators.map(async (c) => {
      const [leagueCount, totalMembers] = await Promise.all([
        prisma.bracketLeague.count({ where: { ownerId: c.userId } }),
        prisma.bracketLeagueMember.count({
          where: { league: { ownerId: c.userId } },
        }),
      ])
      return {
        userId: c.userId,
        handle: c.handle,
        displayName: c.user.displayName ?? null,
        avatarUrl: c.user.avatarUrl ?? null,
        verified: !!c.verifiedAt,
        leagueCount,
        totalMembers,
      }
    })
  )

  const sorted = sort === "leagues"
    ? withCounts.sort((a, b) => b.leagueCount - a.leagueCount)
    : withCounts.sort((a, b) => b.totalMembers - a.totalMembers)

  return sorted.slice(0, limit).map((row, i) => ({
    ...row,
    rank: i + 1,
  }))
}

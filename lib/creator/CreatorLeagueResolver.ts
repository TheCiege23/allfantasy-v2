/**
 * CreatorLeagueResolver — resolve creator for a league, list public creator leagues.
 */

import { prisma } from "@/lib/prisma"
import { isVerifiedCreator } from "./CreatorProfileService"

export interface CreatorLeagueCard {
  id: string
  name: string
  joinCode: string
  joinUrl: string
  tournamentName: string
  season: number
  sport: string
  memberCount: number
  maxManagers: number
  isPrivate: boolean
  scoringMode: string
}

export interface CreatorForLeague {
  userId: string
  handle: string
  displayName: string | null
  avatarUrl: string | null
  verified: boolean
}

/**
 * If the league owner is a verified creator, return their public creator info.
 */
export async function getCreatorForLeague(leagueId: string): Promise<CreatorForLeague | null> {
  const league = await prisma.bracketLeague.findUnique({
    where: { id: leagueId },
    select: { ownerId: true, owner: { select: { id: true, displayName: true, avatarUrl: true } } },
  })
  if (!league) return null

  const creator = await prisma.creatorProfile.findUnique({
    where: { userId: league.ownerId },
    select: { userId: true, handle: true, verifiedAt: true },
  })
  if (!creator || !creator.verifiedAt) return null

  return {
    userId: creator.userId,
    handle: creator.handle,
    displayName: league.owner?.displayName ?? null,
    avatarUrl: league.owner?.avatarUrl ?? null,
    verified: true,
  }
}

/**
 * List public leagues owned by a creator (by userId). For profile page.
 */
export async function getPublicCreatorLeagues(userId: string, limit = 20): Promise<CreatorLeagueCard[]> {
  const isCreator = await isVerifiedCreator(userId)
  if (!isCreator) return []

  const baseUrl = typeof process !== "undefined" ? process.env.NEXTAUTH_URL ?? "https://allfantasy.ai" : "https://allfantasy.ai"

  const leagues = await (prisma as any).bracketLeague.findMany({
    where: { ownerId: userId },
    include: {
      tournament: { select: { name: true, season: true, sport: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return leagues.map((lg: any) => {
    const rules = (lg.scoringRules || {}) as any
    return {
      id: lg.id,
      name: lg.name,
      joinCode: lg.joinCode,
      joinUrl: `${baseUrl}/brackets/join?code=${encodeURIComponent(lg.joinCode)}`,
      tournamentName: lg.tournament?.name ?? "",
      season: lg.tournament?.season ?? 0,
      sport: lg.tournament?.sport ?? "NFL",
      memberCount: lg._count?.members ?? 0,
      maxManagers: Number(lg.maxManagers) || 100,
      isPrivate: Boolean(lg.isPrivate),
      scoringMode: rules.mode || rules.scoringMode || "momentum",
    }
  })
}

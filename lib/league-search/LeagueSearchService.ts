/**
 * League Search Engine (PROMPT 224).
 * Fast search by league name, commissioner, sport, and league type.
 */

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { isSupportedSport, normalizeToSupportedSport } from "@/lib/sport-scope"
import type { LeagueSearchInput, LeagueSearchHit, LeagueSearchResult } from "./types"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function normalizeQuery(s: string | null | undefined): string {
  return typeof s === "string" ? s.trim().slice(0, 120) : ""
}

/**
 * Resolve user IDs whose display name or sleeper username contains the given query (case-insensitive).
 */
async function resolveCommissionerUserIds(query: string): Promise<string[]> {
  if (!query || query.length < 2) return []
  const profiles = await prisma.userProfile.findMany({
    where: {
      OR: [
        { displayName: { contains: query, mode: "insensitive" } },
        { sleeperUsername: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { userId: true },
    take: 500,
  })
  return profiles.map((p) => p.userId)
}

/**
 * Build league type filter: leagueVariant contains term, or isDynasty for "dynasty"/"redraft".
 */
function buildLeagueTypeWhere(leagueType: string): Prisma.LeagueWhereInput {
  const lower = leagueType.toLowerCase()
  const isDynasty = lower === "dynasty"
  const isRedraft = lower === "redraft"
  if (isDynasty) return { isDynasty: true }
  if (isRedraft) return { isDynasty: false }
  return {
    OR: [
      { leagueVariant: { contains: leagueType, mode: "insensitive" } },
      { leagueVariant: { contains: lower, mode: "insensitive" } },
    ],
  }
}

/**
 * Search leagues by name, commissioner, sport, and league type.
 * Uses indexed fields (userId, sport, status) and contains for text.
 */
export async function searchLeagues(input: LeagueSearchInput): Promise<LeagueSearchResult> {
  const limit = Math.min(
    Math.max(Number(input.limit) ?? DEFAULT_LIMIT, 1),
    MAX_LIMIT
  )
  const offset = Math.max(Number(input.offset) ?? 0, 0)

  const nameQ = normalizeQuery(input.leagueName)
  const commissionerQ = normalizeQuery(input.commissioner)
  const sportRaw = input.sport?.trim() || null
  const sport = sportRaw && isSupportedSport(sportRaw) ? normalizeToSupportedSport(sportRaw) : null
  const leagueTypeQ = normalizeQuery(input.leagueType)

  const conditions: Prisma.LeagueWhereInput[] = []

  if (nameQ.length >= 2) {
    conditions.push({ name: { contains: nameQ, mode: "insensitive" } })
  }

  if (commissionerQ.length >= 2) {
    const commissionerIds = await resolveCommissionerUserIds(commissionerQ)
    if (commissionerIds.length === 0) {
      return { hits: [], total: 0, limit, offset }
    }
    conditions.push({ userId: { in: commissionerIds } })
  }

  if (sport) {
    conditions.push({ sport })
  }

  if (leagueTypeQ.length >= 1) {
    conditions.push(buildLeagueTypeWhere(leagueTypeQ))
  }

  const where: Prisma.LeagueWhereInput =
    conditions.length === 0 ? {} : conditions.length === 1 ? conditions[0]! : { AND: conditions }

  const [hits, total] = await Promise.all([
    prisma.league.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            profile: { select: { displayName: true } },
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      take: limit,
      skip: offset,
    }),
    prisma.league.count({ where }),
  ])

  const result: LeagueSearchHit[] = hits.map((l) => ({
    id: l.id,
    name: l.name ?? null,
    sport: l.sport,
    leagueVariant: l.leagueVariant ?? null,
    isDynasty: l.isDynasty,
    season: l.season ?? null,
    leagueSize: l.leagueSize ?? null,
    commissionerId: l.userId,
    commissionerName:
      (l.user?.profile?.displayName ?? l.user?.displayName) ?? null,
    platform: l.platform,
    platformLeagueId: l.platformLeagueId,
  }))

  return { hits: result, total, limit, offset }
}

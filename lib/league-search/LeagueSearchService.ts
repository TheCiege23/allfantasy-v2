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
const CACHE_TTL_MS = 15_000

type CacheEntry = {
  expiresAt: number
  value: LeagueSearchResult
}
const SEARCH_CACHE = new Map<string, CacheEntry>()

function normalizeQuery(s: string | null | undefined): string {
  return typeof s === "string" ? s.trim().slice(0, 120) : ""
}

function normalizeOffset(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value))
}

function normalizeLimit(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.trunc(value), 1), MAX_LIMIT)
}

function normalizeLeagueTypeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/[-\s]+/g, "_")
}

function cloneResult(result: LeagueSearchResult): LeagueSearchResult {
  return {
    ...result,
    hits: result.hits.map((hit) => ({ ...hit })),
  }
}

function getCacheKey(input: {
  query: string
  leagueName: string
  commissioner: string
  sport: string | null
  leagueType: string
  limit: number
  offset: number
}): string {
  return JSON.stringify(input)
}

function getCachedResult(key: string): LeagueSearchResult | null {
  const now = Date.now()
  const current = SEARCH_CACHE.get(key)
  if (!current) return null
  if (current.expiresAt <= now) {
    SEARCH_CACHE.delete(key)
    return null
  }
  return cloneResult(current.value)
}

function setCachedResult(key: string, value: LeagueSearchResult): void {
  SEARCH_CACHE.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value: cloneResult(value) })
  if (SEARCH_CACHE.size > 200) {
    const oldestKey = SEARCH_CACHE.keys().next().value
    if (oldestKey) SEARCH_CACHE.delete(oldestKey)
  }
}

/**
 * Resolve user IDs whose display name or sleeper username contains the given query (case-insensitive).
 */
async function resolveCommissionerUserIds(query: string): Promise<string[]> {
  if (!query || query.length < 2) return []
  const [profiles, appUsers] = await Promise.all([
    prisma.userProfile.findMany({
      where: {
        OR: [
          { displayName: { contains: query, mode: "insensitive" } },
          { sleeperUsername: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { userId: true },
      take: 500,
    }),
    prisma.appUser.findMany({
      where: {
        OR: [
          { displayName: { contains: query, mode: "insensitive" } },
          { username: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: 500,
    }),
  ])
  const out = new Set<string>()
  for (const profile of profiles) {
    if (profile.userId) out.add(profile.userId)
  }
  for (const appUser of appUsers) {
    if (appUser.id) out.add(appUser.id)
  }
  return [...out]
}

/**
 * Build league type filter: leagueVariant contains term, or isDynasty for "dynasty"/"redraft".
 */
function buildLeagueTypeWhere(leagueType: string): Prisma.LeagueWhereInput {
  const lower = normalizeLeagueTypeQuery(leagueType)
  const isDynasty = lower === "dynasty"
  const isRedraft = lower === "redraft" || lower === "standard"
  if (isDynasty) return { isDynasty: true }
  if (isRedraft) return { isDynasty: false }
  return {
    OR: [
      { leagueVariant: { contains: leagueType, mode: "insensitive" } },
      { leagueVariant: { contains: lower, mode: "insensitive" } },
      { leagueVariant: { contains: lower.replace(/_/g, " "), mode: "insensitive" } },
    ],
  }
}

/**
 * Search leagues by name, commissioner, sport, and league type.
 * Uses indexed fields (userId, sport, status) and contains for text.
 */
export async function searchLeagues(input: LeagueSearchInput): Promise<LeagueSearchResult> {
  const limit = normalizeLimit(input.limit ?? undefined)
  const offset = normalizeOffset(input.offset ?? undefined)

  const genericQ = normalizeQuery(input.query)
  const nameQ = normalizeQuery(input.leagueName)
  const commissionerQ = normalizeQuery(input.commissioner)
  const sportRaw = input.sport?.trim() || null
  const sport = sportRaw && isSupportedSport(sportRaw) ? normalizeToSupportedSport(sportRaw) : null
  const leagueTypeQ = normalizeQuery(input.leagueType)
  if (!genericQ && !nameQ && !commissionerQ && !sport && !leagueTypeQ) {
    return { hits: [], total: 0, limit, offset }
  }

  const cacheKey = getCacheKey({
    query: genericQ,
    leagueName: nameQ,
    commissioner: commissionerQ,
    sport,
    leagueType: normalizeLeagueTypeQuery(leagueTypeQ),
    limit,
    offset,
  })
  const cached = getCachedResult(cacheKey)
  if (cached) return cached

  const conditions: Prisma.LeagueWhereInput[] = []

  if (genericQ.length >= 2) {
    const commissionerIdsForGeneric = await resolveCommissionerUserIds(genericQ)
    const genericOrConditions: Prisma.LeagueWhereInput[] = [
      { name: { contains: genericQ, mode: "insensitive" } },
    ]
    if (commissionerIdsForGeneric.length > 0) {
      genericOrConditions.push({ userId: { in: commissionerIdsForGeneric } })
    }
    conditions.push({ OR: genericOrConditions })
  }

  if (nameQ.length >= 2) {
    conditions.push({ name: { contains: nameQ, mode: "insensitive" } })
  }

  if (commissionerQ.length >= 2) {
    const commissionerIds = await resolveCommissionerUserIds(commissionerQ)
    if (commissionerIds.length === 0) {
      const empty = { hits: [], total: 0, limit, offset }
      setCachedResult(cacheKey, empty)
      return empty
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
    conditions.length === 1 ? conditions[0]! : { AND: conditions }

  const [hits, total] = await Promise.all([
    prisma.league.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
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
      (l.user?.profile?.displayName ?? l.user?.displayName ?? l.user?.username) ?? null,
    platform: l.platform,
    platformLeagueId: l.platformLeagueId,
  }))

  const payload = { hits: result, total, limit, offset }
  setCachedResult(cacheKey, payload)
  return payload
}

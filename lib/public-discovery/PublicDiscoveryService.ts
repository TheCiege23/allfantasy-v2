/**
 * Public League Discovery Engine (PROMPT 144).
 * Aggregates public bracket leagues and creator leagues; ranking, filters, sort.
 * PROMPT 226: Cached league results, fast queries, fast pagination.
 */

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { SUPPORTED_SPORTS, isSupportedSport } from "@/lib/sport-scope"
import {
  clampCareerTier,
  extractLeagueCareerTier,
  isLeagueVisibleForCareerTier,
} from "@/lib/ranking/tier-visibility"
import {
  getCachedBracketCards,
  setCachedBracketCards,
  getCachedCreatorCards,
  setCachedCreatorCards,
  clearDiscoveryCache,
} from "./DiscoveryCache"

export { clearDiscoveryCache }
import type {
  DiscoveryCard,
  DiscoverLeaguesInput,
  DiscoverLeaguesResult,
  DiscoverySort,
  DiscoveryFormat,
  EntryFeeFilter,
} from "./types"

export interface DiscoveryViewerContext {
  viewerTier?: number | null
  viewerUserId?: string | null
  viewerIsAdmin?: boolean
}

const DEFAULT_BASE_URL =
  typeof process !== "undefined" ? process.env.NEXTAUTH_URL ?? "https://allfantasy.ai" : "https://allfantasy.ai"

/** Max leagues per source per request; pagination is in-memory from cached/fetched list. */
const DISCOVERY_TAKE = 300

function toCard(
  source: "bracket" | "creator",
  row: {
    id: string
    name: string
    description?: string | null
    sport: string
    memberCount: number
    maxMembers: number
    joinCode?: string
    inviteCode?: string
    createdAt: Date
    isPrivate?: boolean
    ownerName?: string | null
    ownerAvatar?: string | null
    tournamentName?: string | null
    season?: number | null
    scoringMode?: string | null
    isPaid?: boolean
    creatorSlug?: string | null
    creatorName?: string | null
    draftDate?: Date | null
    draftType?: string | null
    creatorLeagueType?: string | null
    isCreatorVerified?: boolean
    leagueTier?: number | null
  },
  baseUrl: string
): DiscoveryCard {
  const joinUrl =
    source === "bracket"
      ? `${baseUrl}/brackets/join?code=${encodeURIComponent(row.joinCode ?? "")}`
      : `${baseUrl}/creator/leagues/${row.id}?join=${encodeURIComponent(row.inviteCode ?? "")}`
  const detailUrl =
    source === "bracket"
      ? `${baseUrl}/brackets/leagues/${row.id}`
      : `${baseUrl}/creator/leagues/${row.id}`
  const fillPct = row.maxMembers > 0 ? Math.round((row.memberCount / row.maxMembers) * 100) : 0
  const teamCount = row.maxMembers
  return {
    source,
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    sport: row.sport,
    memberCount: row.memberCount,
    maxMembers: row.maxMembers,
    joinUrl,
    detailUrl,
    ownerName: row.ownerName ?? null,
    ownerAvatar: row.ownerAvatar ?? null,
    creatorSlug: row.creatorSlug ?? null,
    creatorName: row.creatorName ?? null,
    tournamentName: row.tournamentName ?? null,
    season: row.season ?? null,
    scoringMode: row.scoringMode ?? null,
    isPaid: row.isPaid ?? false,
    isPrivate: row.isPrivate ?? false,
    createdAt: row.createdAt.toISOString(),
    fillPct,
    leagueType: source,
    draftType: row.draftType ?? null,
    teamCount,
    draftDate: row.draftDate ? row.draftDate.toISOString() : null,
    commissionerName: row.ownerName ?? null,
    aiFeatures: [],
    creatorLeagueType: row.creatorLeagueType ?? null,
    isCreatorVerified: row.isCreatorVerified ?? false,
    leagueTier: row.leagueTier ?? null,
  }
}

/** Uncached DB fetch for bracket leagues (used when cache miss). */
async function fetchPublicBracketLeaguesUncached(options: {
  sport: string | null
  query: string | null
  baseUrl: string
}): Promise<DiscoveryCard[]> {
  const where: { isPrivate: boolean; tournament?: { sport?: string }; OR?: unknown[] } = {
    isPrivate: false,
  }
  if (options.sport && isSupportedSport(options.sport)) {
    where.tournament = { sport: options.sport }
  }
  if (options.query && options.query.length >= 2) {
    where.OR = [
      { name: { contains: options.query, mode: "insensitive" } },
      { tournament: { name: { contains: options.query, mode: "insensitive" } } },
    ]
  }

  const leagues = await prisma.bracketLeague.findMany({
    where: where as Prisma.BracketLeagueWhereInput,
    select: {
      id: true,
      name: true,
      joinCode: true,
      isPrivate: true,
      createdAt: true,
      deadline: true,
      maxManagers: true,
      scoringRules: true,
      ownerId: true,
      tournamentId: true,
      owner: { select: { displayName: true, avatarUrl: true } },
      tournament: { select: { name: true, season: true, sport: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
    take: DISCOVERY_TAKE,
  })

  return leagues.map((lg) => {
    const rules = (lg.scoringRules as Record<string, unknown>) || {}
    const mode = (rules.mode ?? rules.scoringMode ?? "momentum") as string
    const maxMembers = Number(lg.maxManagers) || 100
    const leagueTier = extractLeagueCareerTier(rules, 1)
    return toCard(
      "bracket",
      {
        id: lg.id,
        name: lg.name,
        sport: lg.tournament?.sport ?? "NFL",
        memberCount: lg._count?.members ?? 0,
        maxMembers,
        joinCode: lg.joinCode,
        createdAt: lg.createdAt,
        isPrivate: lg.isPrivate,
        ownerName: lg.owner?.displayName ?? null,
        ownerAvatar: lg.owner?.avatarUrl ?? null,
        tournamentName: lg.tournament?.name ?? null,
        season: lg.tournament?.season ?? null,
        scoringMode: mode,
        isPaid: Boolean(rules.isPaidLeague),
        draftDate: lg.deadline ?? null,
        leagueTier,
      },
      options.baseUrl
    )
  })
}

async function fetchPublicBracketLeagues(options: {
  sport: string | null
  query: string | null
  baseUrl: string
}): Promise<DiscoveryCard[]> {
  const cached = getCachedBracketCards(options.baseUrl, options.sport, options.query)
  if (cached) return cached
  const cards = await fetchPublicBracketLeaguesUncached(options)
  setCachedBracketCards(options.baseUrl, options.sport, options.query, cards)
  return cards
}

/** Uncached DB fetch for creator leagues by sport only (query filtered in-memory). */
async function fetchPublicCreatorLeaguesUncached(options: {
  sport: string | null
  baseUrl: string
}): Promise<DiscoveryCard[]> {
  const where: { isPublic: boolean; creator: { visibility: string }; sport?: string } = {
    isPublic: true,
    creator: { visibility: "public" },
  }
  if (options.sport && isSupportedSport(options.sport)) {
    where.sport = options.sport
  }

  const leagues = await prisma.creatorLeague.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      sport: true,
      memberCount: true,
      maxMembers: true,
      inviteCode: true,
      createdAt: true,
      isPublic: true,
      type: true,
      joinDeadline: true,
      creatorId: true,
      creator: {
        select: {
          slug: true,
          handle: true,
          displayName: true,
          avatarUrl: true,
          verifiedAt: true,
          user: { select: { displayName: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: DISCOVERY_TAKE,
  })

  return leagues.map((l) =>
    toCard(
      "creator",
      {
        id: l.id,
        name: l.name,
        description: l.description,
        sport: l.sport,
        memberCount: l.memberCount,
        maxMembers: l.maxMembers,
        inviteCode: l.inviteCode,
        createdAt: l.createdAt,
        isPrivate: !l.isPublic,
        creatorSlug: l.creator.slug,
        creatorName: l.creator.displayName ?? l.creator.handle,
        ownerName: l.creator.user?.displayName ?? l.creator.displayName ?? l.creator.handle,
        ownerAvatar: l.creator.avatarUrl ?? l.creator.user?.avatarUrl ?? null,
        draftDate: l.joinDeadline ?? null,
        creatorLeagueType: l.type ?? null,
        isCreatorVerified: !!l.creator?.verifiedAt,
      },
      options.baseUrl
    )
  )
}

async function fetchPublicCreatorLeagues(options: {
  sport: string | null
  query: string | null
  baseUrl: string
}): Promise<DiscoveryCard[]> {
  let list = getCachedCreatorCards(options.baseUrl, options.sport)
  if (!list) {
    list = await fetchPublicCreatorLeaguesUncached({
      sport: options.sport,
      baseUrl: options.baseUrl,
    })
    setCachedCreatorCards(options.baseUrl, options.sport, list)
  }
  if (options.query && options.query.length >= 2) {
    const q = options.query.toLowerCase()
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.creatorName?.toLowerCase().includes(q) ?? false) ||
        (c.description?.toLowerCase().includes(q) ?? false)
    )
  }
  return list
}

function applyVisibility(cards: DiscoveryCard[], visibility: "public" | "all"): DiscoveryCard[] {
  if (visibility === "all") return cards
  return cards.filter((c) => !c.isPrivate)
}

function applyTeamCount(
  cards: DiscoveryCard[],
  min: number | null | undefined,
  max: number | null | undefined
): DiscoveryCard[] {
  if (min == null && max == null) return cards
  return cards.filter((c) => {
    if (min != null && c.teamCount < min) return false
    if (max != null && c.teamCount > max) return false
    return true
  })
}

function applyAiEnabled(cards: DiscoveryCard[], aiEnabled: boolean | null | undefined): DiscoveryCard[] {
  if (!aiEnabled) return cards
  return cards.filter((c) => c.aiFeatures != null && c.aiFeatures.length > 0)
}

function applyEntryFee(cards: DiscoveryCard[], entryFee: EntryFeeFilter): DiscoveryCard[] {
  if (entryFee === "all") return cards
  if (entryFee === "free") return cards.filter((c) => !c.isPaid)
  return cards.filter((c) => c.isPaid)
}

function applySort(cards: DiscoveryCard[], sort: DiscoverySort): DiscoveryCard[] {
  const arr = [...cards]
  if (sort === "popularity") {
    arr.sort((a, b) => b.memberCount - a.memberCount)
  } else if (sort === "newest") {
    arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } else {
    arr.sort((a, b) => {
      const aFull = a.maxMembers > 0 && a.memberCount >= a.maxMembers ? -1 : a.fillPct
      const bFull = b.maxMembers > 0 && b.memberCount >= b.maxMembers ? -1 : b.fillPct
      return bFull - aFull
    })
  }
  return arr
}

async function applyTierPolicy(
  cards: DiscoveryCard[],
  viewerContext?: DiscoveryViewerContext
): Promise<DiscoveryCard[]> {
  const viewerTier = clampCareerTier(viewerContext?.viewerTier, 1)
  const viewerIsAdmin = viewerContext?.viewerIsAdmin === true
  const viewerUserId = viewerContext?.viewerUserId || null

  let ownerLeagueIds = new Set<string>()
  if (viewerUserId) {
    try {
      const rows = await prisma.bracketLeague.findMany({
        where: { ownerId: viewerUserId },
        select: { id: true },
      })
      ownerLeagueIds = new Set(rows.map((r) => r.id))
    } catch {
      ownerLeagueIds = new Set<string>()
    }
  }

  const resolved: DiscoveryCard[] = []
  for (const card of cards) {
    if (card.source !== "bracket") {
      resolved.push({ ...card, inviteOnlyByTier: false })
      continue
    }

    const leagueTier = clampCareerTier(card.leagueTier, viewerTier)
    const inRange = isLeagueVisibleForCareerTier(viewerTier, leagueTier, 1)
    if (inRange) {
      resolved.push({ ...card, leagueTier, inviteOnlyByTier: false })
      continue
    }

    const canBypass = viewerIsAdmin || ownerLeagueIds.has(card.id)
    if (canBypass) {
      resolved.push({ ...card, leagueTier, inviteOnlyByTier: true })
    }
  }

  return resolved
}

export async function discoverPublicLeagues(
  input: DiscoverLeaguesInput,
  baseUrl: string = DEFAULT_BASE_URL,
  viewerContext?: DiscoveryViewerContext
): Promise<DiscoverLeaguesResult> {
  const page = Math.max(1, Number(input.page) || 1)
  const limit = Math.min(24, Math.max(6, Number(input.limit) || 12))
  const format: DiscoveryFormat = input.format === "creator" || input.format === "bracket" ? input.format : "all"
  const sort: DiscoverySort = input.sort === "filling_fast" || input.sort === "newest" ? input.sort : "popularity"
  const entryFee: EntryFeeFilter = input.entryFee === "free" || input.entryFee === "paid" ? input.entryFee : "all"
  const visibility = input.visibility === "all" ? "all" : "public"
  const sport = input.sport && isSupportedSport(input.sport) ? input.sport : null
  const query = typeof input.query === "string" ? input.query.trim().slice(0, 100) : null
  const teamCountMin = input.teamCountMin != null ? Number(input.teamCountMin) : null
  const teamCountMax = input.teamCountMax != null ? Number(input.teamCountMax) : null
  const aiEnabled = input.aiEnabled === true

  const [bracketCards, creatorCards] = await Promise.all([
    format !== "creator" ? fetchPublicBracketLeagues({ sport, query, baseUrl }) : [],
    format !== "bracket" ? fetchPublicCreatorLeagues({ sport, query, baseUrl }) : [],
  ])

  let combined = [...bracketCards, ...creatorCards]
  combined = applyVisibility(combined, visibility)
  combined = await applyTierPolicy(combined, viewerContext)
  combined = applyTeamCount(combined, teamCountMin, teamCountMax)
  combined = applyAiEnabled(combined, aiEnabled)
  combined = applyEntryFee(combined, entryFee)
  combined = applySort(combined, sort)

  const total = combined.length
  const totalPages = Math.ceil(total / limit) || 1
  const start = (page - 1) * limit
  const leagues = combined.slice(start, start + limit) // fast pagination: in-memory slice from (cached) list

  return { leagues, total, page, limit, totalPages }
}

export async function getTrendingLeagues(
  limit: number = 6,
  sport: string | null = null,
  baseUrl: string = DEFAULT_BASE_URL,
  viewerContext?: DiscoveryViewerContext
): Promise<DiscoveryCard[]> {
  const [bracketCards, creatorCards] = await Promise.all([
    fetchPublicBracketLeagues({ sport, query: null, baseUrl }),
    fetchPublicCreatorLeagues({ sport, query: null, baseUrl }),
  ])
  let combined = applySort([...bracketCards, ...creatorCards], "popularity")
  combined = await applyTierPolicy(combined, viewerContext)
  if (sport) combined = combined.filter((c) => c.sport === sport)
  return combined.slice(0, limit)
}

export async function getRecommendedLeagues(
  limit: number = 6,
  sport: string | null = null,
  baseUrl: string = DEFAULT_BASE_URL,
  viewerContext?: DiscoveryViewerContext
): Promise<DiscoveryCard[]> {
  const [bracketCards, creatorCards] = await Promise.all([
    fetchPublicBracketLeagues({ sport, query: null, baseUrl }),
    fetchPublicCreatorLeagues({ sport, query: null, baseUrl }),
  ])
  let combined = applySort([...bracketCards, ...creatorCards], "filling_fast")
  combined = await applyTierPolicy(combined, viewerContext)
  combined = combined.filter((c) => c.maxMembers > 0 && c.memberCount < c.maxMembers)
  if (sport) combined = combined.filter((c) => c.sport === sport)
  return combined.slice(0, limit)
}

export function getDiscoverySports(): { value: string; label: string }[] {
  return SUPPORTED_SPORTS.map((s) => ({ value: s, label: s }))
}

/**
 * Fetch a pool of discoverable leagues for recommendation engine (no pagination).
 * Returns up to maxTotal cards (bracket + creator), public only, sorted by filling_fast.
 */
export async function getDiscoverableLeaguesPool(
  baseUrl: string = DEFAULT_BASE_URL,
  options: { sport?: string | null; maxTotal?: number; viewerContext?: DiscoveryViewerContext } = {}
): Promise<DiscoveryCard[]> {
  const maxTotal = Math.min(200, options.maxTotal ?? 100)
  const sport = options.sport && isSupportedSport(options.sport) ? options.sport : null

  const [bracketCards, creatorCards] = await Promise.all([
    fetchPublicBracketLeagues({ sport, query: null, baseUrl }),
    fetchPublicCreatorLeagues({ sport, query: null, baseUrl }),
  ])
  let combined = [...bracketCards, ...creatorCards]
  combined = combined.filter((c) => !c.isPrivate)
  combined = await applyTierPolicy(combined, options.viewerContext)
  combined = applySort(combined, "filling_fast")
  return combined.slice(0, maxTotal)
}

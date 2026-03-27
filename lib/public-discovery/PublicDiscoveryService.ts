/**
 * Public League Discovery Engine (PROMPT 144).
 * Aggregates public fantasy leagues, creator leagues, and bracket challenges.
 */

import { prisma } from "@/lib/prisma"
import { getCareerTierName, clampCareerTier, isLeagueVisibleForCareerTier } from "@/lib/ranking/tier-visibility"
import { isSupportedSport } from "@/lib/sport-scope"
import { getDiscoverySports } from "./discovery-sports"
import {
  getCachedBracketCards,
  getCachedCreatorCards,
  getCachedFantasyCards,
  setCachedBracketCards,
  setCachedCreatorCards,
  setCachedFantasyCards,
  clearDiscoveryCache,
} from "./DiscoveryCache"
import {
  queryPublicBracketLeagueCards,
  queryPublicCreatorLeagueCards,
  queryPublicFantasyLeagueCards,
} from "./DiscoveryQueryLayer"
import type {
  DiscoveryCard,
  DiscoverLeaguesInput,
  DiscoverLeaguesResult,
  DiscoveryFormat,
  DiscoveryLeagueStyle,
  DiscoverySort,
  EntryFeeFilter,
  LeagueStyleFilter,
} from "./types"

export { clearDiscoveryCache }

export interface DiscoveryViewerContext {
  viewerTier?: number | null
  viewerUserId?: string | null
  viewerIsAdmin?: boolean
}

const DEFAULT_BASE_URL =
  typeof process !== "undefined" ? process.env.NEXTAUTH_URL ?? "https://allfantasy.ai" : "https://allfantasy.ai"

const DISCOVERY_TAKE = 300

function normalizeFormat(value: unknown): DiscoveryFormat {
  return value === "fantasy" || value === "creator" || value === "bracket" ? value : "all"
}

function normalizeSort(value: unknown): DiscoverySort {
  return value === "newest" || value === "filling_fast" ? value : "popularity"
}

function normalizeEntryFee(value: unknown): EntryFeeFilter {
  return value === "free" || value === "paid" ? value : "all"
}

function normalizeStyle(value: unknown): LeagueStyleFilter {
  return value === "dynasty" ||
    value === "redraft" ||
    value === "best_ball" ||
    value === "keeper" ||
    value === "survivor" ||
    value === "bracket" ||
    value === "community"
    ? value
    : "all"
}

export function calculateDiscoveryTrendingScore(card: DiscoveryCard): number {
  const ageHours = Math.max(0, (Date.now() - new Date(card.createdAt).getTime()) / 3_600_000)
  const freshnessBoost = Math.max(0, 24 - Math.min(24, ageHours / 4))
  const sourceBoost = card.source === "creator" ? 8 : card.source === "fantasy" ? 6 : 4
  const verifiedBoost = card.isCreatorVerified ? 6 : 0
  return Math.round(card.memberCount * 2 + card.fillPct * 0.85 + freshnessBoost + sourceBoost + verifiedBoost)
}

export function calculateDiscoveryFillingFastScore(card: DiscoveryCard): number {
  const notFull = card.maxMembers <= 0 || card.memberCount < card.maxMembers ? 1 : 0
  const urgencyBoost = card.fillPct >= 80 ? 20 : card.fillPct >= 60 ? 12 : card.fillPct >= 40 ? 6 : 0
  return Math.round(card.fillPct * 1.35 + card.memberCount * 0.75 + urgencyBoost + notFull * 5)
}

export function matchesDiscoveryLeagueStyle(
  card: Pick<DiscoveryCard, "leagueStyle">,
  style: LeagueStyleFilter
): boolean {
  if (style === "all") return true
  return card.leagueStyle === style
}

function applyVisibility(cards: DiscoveryCard[], visibility: "public" | "all"): DiscoveryCard[] {
  if (visibility === "all") return cards
  return cards.filter((card) => !card.isPrivate)
}

function applyTeamCount(
  cards: DiscoveryCard[],
  min: number | null | undefined,
  max: number | null | undefined
): DiscoveryCard[] {
  if (min == null && max == null) return cards
  return cards.filter((card) => {
    if (min != null && card.teamCount < min) return false
    if (max != null && card.teamCount > max) return false
    return true
  })
}

function applyAiEnabled(cards: DiscoveryCard[], aiEnabled: boolean | null | undefined): DiscoveryCard[] {
  if (!aiEnabled) return cards
  return cards.filter((card) => Array.isArray(card.aiFeatures) && card.aiFeatures.length > 0)
}

function applyEntryFee(cards: DiscoveryCard[], entryFee: EntryFeeFilter): DiscoveryCard[] {
  if (entryFee === "all") return cards
  if (entryFee === "free") return cards.filter((card) => !card.isPaid)
  return cards.filter((card) => card.isPaid)
}

function applyLeagueStyle(cards: DiscoveryCard[], style: LeagueStyleFilter): DiscoveryCard[] {
  if (style === "all") return cards
  return cards.filter((card) => matchesDiscoveryLeagueStyle(card, style))
}

function applySort(cards: DiscoveryCard[], sort: DiscoverySort): DiscoveryCard[] {
  const arr = [...cards]
  if (sort === "popularity") {
    arr.sort((a, b) => calculateDiscoveryTrendingScore(b) - calculateDiscoveryTrendingScore(a))
  } else if (sort === "newest") {
    arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } else {
    arr.sort((a, b) => calculateDiscoveryFillingFastScore(b) - calculateDiscoveryFillingFastScore(a))
  }
  return arr
}

async function fetchPublicFantasyLeagues(options: {
  sport: string | null
  query: string | null
  baseUrl: string
}): Promise<DiscoveryCard[]> {
  const cached = getCachedFantasyCards(options.baseUrl, options.sport, options.query)
  if (cached) return cached

  const cards = await queryPublicFantasyLeagueCards({
    sport: options.sport,
    query: options.query,
    baseUrl: options.baseUrl,
    take: DISCOVERY_TAKE,
  })
  setCachedFantasyCards(options.baseUrl, options.sport, options.query, cards)
  return cards
}

async function fetchPublicBracketLeagues(options: {
  sport: string | null
  query: string | null
  baseUrl: string
}): Promise<DiscoveryCard[]> {
  const cached = getCachedBracketCards(options.baseUrl, options.sport, options.query)
  if (cached) return cached

  const cards = await queryPublicBracketLeagueCards({
    sport: options.sport,
    query: options.query,
    baseUrl: options.baseUrl,
    take: DISCOVERY_TAKE,
  })
  setCachedBracketCards(options.baseUrl, options.sport, options.query, cards)
  return cards
}

async function fetchPublicCreatorLeagues(options: {
  sport: string | null
  query: string | null
  baseUrl: string
}): Promise<DiscoveryCard[]> {
  let cards = getCachedCreatorCards(options.baseUrl, options.sport)
  if (!cards) {
    cards = await queryPublicCreatorLeagueCards({
      sport: options.sport,
      query: null,
      baseUrl: options.baseUrl,
      take: DISCOVERY_TAKE,
    })
    setCachedCreatorCards(options.baseUrl, options.sport, cards)
  }

  if (options.query && options.query.trim().length >= 2) {
    const query = options.query.trim().toLowerCase()
    cards = cards.filter(
      (card) =>
        card.name.toLowerCase().includes(query) ||
        (card.creatorName?.toLowerCase().includes(query) ?? false) ||
        (card.description?.toLowerCase().includes(query) ?? false)
    )
  }

  return cards
}

async function getOwnedLeagueSets(viewerUserId: string | null) {
  if (!viewerUserId) {
    return {
      fantasyIds: new Set<string>(),
      bracketIds: new Set<string>(),
      creatorIds: new Set<string>(),
    }
  }

  try {
    const [fantasyRows, bracketRows, creatorRows] = await Promise.all([
      prisma.league.findMany({
        where: { userId: viewerUserId },
        select: { id: true },
      }),
      prisma.bracketLeague.findMany({
        where: { ownerId: viewerUserId },
        select: { id: true },
      }),
      prisma.creatorLeague.findMany({
        where: {
          creator: {
            userId: viewerUserId,
          },
        },
        select: { id: true },
      }),
    ])

    return {
      fantasyIds: new Set(fantasyRows.map((row) => row.id)),
      bracketIds: new Set(bracketRows.map((row) => row.id)),
      creatorIds: new Set(creatorRows.map((row) => row.id)),
    }
  } catch {
    return {
      fantasyIds: new Set<string>(),
      bracketIds: new Set<string>(),
      creatorIds: new Set<string>(),
    }
  }
}

async function applyTierPolicy(
  cards: DiscoveryCard[],
  viewerContext?: DiscoveryViewerContext
): Promise<{ cards: DiscoveryCard[]; hiddenCount: number; viewerTier: number }> {
  const viewerTier = clampCareerTier(viewerContext?.viewerTier, 1)
  const viewerIsAdmin = viewerContext?.viewerIsAdmin === true
  const viewerUserId = viewerContext?.viewerUserId ?? null
  const owned = await getOwnedLeagueSets(viewerUserId)

  const resolved: DiscoveryCard[] = []
  let hiddenCount = 0

  for (const card of cards) {
    const leagueTier = clampCareerTier(card.leagueTier, viewerTier)
    const inRange = isLeagueVisibleForCareerTier(viewerTier, leagueTier, 1)

    if (inRange) {
      resolved.push({
        ...card,
        leagueTier,
        inviteOnlyByTier: false,
        canJoinByRanking: true,
      })
      continue
    }

    const ownerBypass =
      (card.source === "fantasy" && owned.fantasyIds.has(card.id)) ||
      (card.source === "bracket" && owned.bracketIds.has(card.id)) ||
      (card.source === "creator" && owned.creatorIds.has(card.id))

    if (viewerIsAdmin || ownerBypass) {
      resolved.push({
        ...card,
        leagueTier,
        inviteOnlyByTier: true,
        canJoinByRanking: false,
      })
    } else {
      hiddenCount += 1
    }
  }

  return { cards: resolved, hiddenCount, viewerTier }
}

export async function discoverPublicLeagues(
  input: DiscoverLeaguesInput,
  baseUrl: string = DEFAULT_BASE_URL,
  viewerContext?: DiscoveryViewerContext
): Promise<DiscoverLeaguesResult> {
  const page = Math.max(1, Number(input.page) || 1)
  const limit = Math.min(24, Math.max(6, Number(input.limit) || 12))
  const format = normalizeFormat(input.format)
  const sort = normalizeSort(input.sort)
  const style = normalizeStyle(input.style)
  const entryFee = normalizeEntryFee(input.entryFee)
  const visibility = input.visibility === "all" ? "all" : "public"
  const sport = input.sport && isSupportedSport(input.sport) ? input.sport : null
  const query = typeof input.query === "string" ? input.query.trim().slice(0, 100) : null
  const teamCountMin = input.teamCountMin != null ? Number(input.teamCountMin) : null
  const teamCountMax = input.teamCountMax != null ? Number(input.teamCountMax) : null
  const aiEnabled = input.aiEnabled === true

  const [fantasyCards, bracketCards, creatorCards] = await Promise.all([
    format === "all" || format === "fantasy"
      ? fetchPublicFantasyLeagues({ sport, query, baseUrl })
      : Promise.resolve([]),
    format === "all" || format === "bracket"
      ? fetchPublicBracketLeagues({ sport, query, baseUrl })
      : Promise.resolve([]),
    format === "all" || format === "creator"
      ? fetchPublicCreatorLeagues({ sport, query, baseUrl })
      : Promise.resolve([]),
  ])

  let combined = [...fantasyCards, ...bracketCards, ...creatorCards]
  combined = applyVisibility(combined, visibility)
  const tierResolved = await applyTierPolicy(combined, viewerContext)
  combined = tierResolved.cards
  combined = applyLeagueStyle(combined, style)
  combined = applyTeamCount(combined, teamCountMin, teamCountMax)
  combined = applyAiEnabled(combined, aiEnabled)
  combined = applyEntryFee(combined, entryFee)
  combined = applySort(combined, sort)

  const total = combined.length
  const totalPages = Math.ceil(total / limit) || 1
  const start = (page - 1) * limit
  const leagues = combined.slice(start, start + limit)

  return {
    leagues,
    total,
    page,
    limit,
    totalPages,
    hasMore: start + leagues.length < total,
    viewerTier: tierResolved.viewerTier,
    viewerTierName: getCareerTierName(tierResolved.viewerTier),
    hiddenByTierPolicy: tierResolved.hiddenCount,
  }
}

export async function getTrendingLeagues(
  limit: number = 6,
  sport: string | null = null,
  baseUrl: string = DEFAULT_BASE_URL,
  viewerContext?: DiscoveryViewerContext
): Promise<DiscoveryCard[]> {
  const [fantasyCards, bracketCards, creatorCards] = await Promise.all([
    fetchPublicFantasyLeagues({ sport, query: null, baseUrl }),
    fetchPublicBracketLeagues({ sport, query: null, baseUrl }),
    fetchPublicCreatorLeagues({ sport, query: null, baseUrl }),
  ])

  const tierResolved = await applyTierPolicy([...fantasyCards, ...bracketCards, ...creatorCards], viewerContext)
  let combined = applySort(tierResolved.cards, "popularity")
  if (sport) combined = combined.filter((card) => card.sport === sport)
  return combined.slice(0, limit)
}

export async function getRecommendedLeagues(
  limit: number = 6,
  sport: string | null = null,
  baseUrl: string = DEFAULT_BASE_URL,
  viewerContext?: DiscoveryViewerContext
): Promise<DiscoveryCard[]> {
  const [fantasyCards, bracketCards, creatorCards] = await Promise.all([
    fetchPublicFantasyLeagues({ sport, query: null, baseUrl }),
    fetchPublicBracketLeagues({ sport, query: null, baseUrl }),
    fetchPublicCreatorLeagues({ sport, query: null, baseUrl }),
  ])

  const tierResolved = await applyTierPolicy([...fantasyCards, ...bracketCards, ...creatorCards], viewerContext)
  let combined = applySort(tierResolved.cards, "filling_fast")
  combined = combined.filter((card) => card.maxMembers > 0 && card.memberCount < card.maxMembers)
  if (sport) combined = combined.filter((card) => card.sport === sport)
  return combined.slice(0, limit)
}

export async function getDiscoverableLeaguesPool(
  baseUrl: string = DEFAULT_BASE_URL,
  options: { sport?: string | null; maxTotal?: number; viewerContext?: DiscoveryViewerContext } = {}
): Promise<DiscoveryCard[]> {
  const maxTotal = Math.min(200, options.maxTotal ?? 100)
  const sport = options.sport && isSupportedSport(options.sport) ? options.sport : null

  const [fantasyCards, bracketCards, creatorCards] = await Promise.all([
    fetchPublicFantasyLeagues({ sport, query: null, baseUrl }),
    fetchPublicBracketLeagues({ sport, query: null, baseUrl }),
    fetchPublicCreatorLeagues({ sport, query: null, baseUrl }),
  ])

  const tierResolved = await applyTierPolicy([...fantasyCards, ...bracketCards, ...creatorCards], options.viewerContext)
  const combined = applySort(tierResolved.cards.filter((card) => !card.isPrivate), "filling_fast")
  return combined.slice(0, maxTotal)
}

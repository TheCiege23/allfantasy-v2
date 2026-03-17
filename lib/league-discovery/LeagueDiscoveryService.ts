/**
 * LeagueDiscoveryService — discover bracket leagues with filters, search, and pagination.
 */

import { prisma } from "@/lib/prisma"
import {
  buildDiscoveryWhere,
  resolveFilters,
  matchesLeagueTypeAndFee,
} from "./LeagueFilterResolver"
import { buildSearchWhere } from "./LeagueSearchResolver"

export interface DiscoverLeaguesInput {
  query?: string | null
  sport?: string | null
  leagueType?: string | null
  entryFee?: string | null
  visibility?: string | null
  difficulty?: string | null
  page?: number
  limit?: number
}

export interface LeagueCard {
  id: string
  name: string
  joinCode: string
  sport: string
  season: number
  tournamentName: string
  tournamentId: string
  scoringMode: string
  isPaidLeague: boolean
  isPrivate: boolean
  memberCount: number
  entryCount: number
  maxManagers: number
  ownerName: string
  ownerAvatar: string | null
  joinUrl: string
}

export interface DiscoverLeaguesResult {
  leagues: LeagueCard[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/** Candidate league shape for AI suggestion (preferences + list). */
export interface CandidateLeague {
  id: string
  name: string
  joinCode?: string
  memberCount?: number
  entryCount?: number
  maxManagers?: number
  scoringMode?: string
  tournamentName?: string
  sport?: string
  activityLevel?: string
  competitionSpread?: string
}

/** User preferences for league suggestion. */
export type UserDiscoveryPreferences = Record<string, unknown>

export interface SuggestLeaguesResult {
  suggested: CandidateLeague[]
}

/** Suggest leagues from a candidate list using preferences (e.g. sport, activity). */
export function suggestLeagues(input: {
  preferences: UserDiscoveryPreferences
  candidates: CandidateLeague[]
}): SuggestLeaguesResult {
  const { candidates } = input
  const sport = typeof input.preferences.sport === 'string' ? input.preferences.sport.trim().toUpperCase() : null
  let list = candidates
  if (sport) {
    list = candidates.filter((c) => !c.sport || c.sport.toUpperCase() === sport)
  }
  if (list.length === 0 && candidates.length > 0) list = candidates
  return { suggested: list }
}

export async function discoverLeagues(input: DiscoverLeaguesInput): Promise<DiscoverLeaguesResult> {
  const page = Math.max(1, Number(input.page) || 1)
  const limit = Math.min(50, Math.max(5, Number(input.limit) || 20))
  const resolved = resolveFilters({
    sport: input.sport,
    leagueType: input.leagueType,
    entryFee: input.entryFee,
    visibility: input.visibility,
    difficulty: input.difficulty,
  })

  const searchWhere = buildSearchWhere(input.query)
  const where = buildDiscoveryWhere(resolved, searchWhere)

  const allMatching = await (prisma as any).bracketLeague.findMany({
    where,
    include: {
      owner: { select: { displayName: true, avatarUrl: true } },
      tournament: { select: { id: true, name: true, season: true, sport: true } },
      _count: { select: { members: true, entries: true } },
      scoringRules: true,
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  })

  const filtered = allMatching.filter((lg: any) =>
    matchesLeagueTypeAndFee(lg.scoringRules as Record<string, unknown>, resolved)
  )
  const total = filtered.length
  const leagues = filtered.slice((page - 1) * limit, page * limit)

  const baseUrl = typeof process !== "undefined" ? process.env.NEXTAUTH_URL ?? "https://allfantasy.ai" : "https://allfantasy.ai"
  const cards: LeagueCard[] = leagues.map((lg: any) => {
    const rules = (lg.scoringRules || {}) as any
    const mode = rules.mode || rules.scoringMode || "momentum"
    const joinUrl = `${baseUrl}/brackets/join?code=${encodeURIComponent(lg.joinCode)}`
    return {
      id: lg.id,
      name: lg.name,
      joinCode: lg.joinCode,
      sport: lg.tournament?.sport ?? "NFL",
      season: lg.tournament?.season ?? 0,
      tournamentName: lg.tournament?.name ?? "",
      tournamentId: lg.tournamentId,
      scoringMode: mode,
      isPaidLeague: Boolean(rules.isPaidLeague),
      isPrivate: Boolean(lg.isPrivate),
      memberCount: lg._count?.members ?? 0,
      entryCount: lg._count?.entries ?? 0,
      maxManagers: Number(lg.maxManagers) || 100,
      ownerName: lg.owner?.displayName ?? "Anonymous",
      ownerAvatar: lg.owner?.avatarUrl ?? null,
      joinUrl,
    }
  })

  return {
    leagues: cards,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  }
}

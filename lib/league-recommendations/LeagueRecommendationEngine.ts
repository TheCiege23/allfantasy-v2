/**
 * League Recommendation Engine (PROMPT 219).
 * Mostly deterministic: score by favorite sports, past leagues, draft participation, league types.
 * AI can enhance explanations later.
 */

import { prisma } from "@/lib/prisma"
import { getDiscoverableLeaguesPool } from "@/lib/public-discovery"
import type { DiscoveryCard } from "@/lib/public-discovery"
import type { UserLeagueProfile, RecommendedLeagueWithExplanation } from "./types"

const DEFAULT_BASE_URL = process.env.NEXTAUTH_URL ?? "https://allfantasy.ai"

/** Build user profile from leagues, bracket/creator memberships, and draft participation. */
export async function getUserLeagueProfile(userId: string): Promise<UserLeagueProfile> {
  const [leagues, bracketMembers, creatorMembers, leaguesWithCompletedDraft] = await Promise.all([
    prisma.league.findMany({
      where: { userId },
      select: { sport: true, leagueSize: true, isDynasty: true, id: true },
    }),
    prisma.bracketLeagueMember.findMany({
      where: { userId },
      select: { leagueId: true },
    }),
    prisma.creatorLeagueMember.findMany({
      where: { userId },
      select: { creatorLeagueId: true },
    }),
    prisma.league.findMany({
      where: {
        userId,
        draftSessions: {
          some: { status: "completed" },
        },
      },
      select: { id: true },
    }),
  ])

  const sportCounts: Record<string, number> = {}
  const teamCounts: number[] = []
  for (const l of leagues) {
    const s = String(l.sport ?? "").toUpperCase()
    if (s) {
      sportCounts[s] = (sportCounts[s] ?? 0) + 1
    }
    if (l.leagueSize != null && l.leagueSize > 0) {
      teamCounts.push(l.leagueSize)
    }
  }
  const preferredSports = Object.entries(sportCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s)
  const preferredTeamCounts = [...new Set(teamCounts)].sort((a, b) => a - b)
  if (preferredTeamCounts.length === 0) preferredTeamCounts.push(12)

  return {
    preferredSports,
    preferredTeamCounts,
    hasBracketLeagues: bracketMembers.length > 0,
    hasCreatorLeagues: creatorMembers.length > 0,
    hasDraftParticipation: leaguesWithCompletedDraft.length > 0,
    bracketLeagueIds: bracketMembers.map((m) => m.leagueId),
    creatorLeagueIds: creatorMembers.map((m) => m.creatorLeagueId),
  }
}

/** Deterministic score for one league (higher = better match). */
function scoreLeague(card: DiscoveryCard, profile: UserLeagueProfile): number {
  let score = 0

  const sportMatch =
    profile.preferredSports.length > 0 && card.sport
      ? profile.preferredSports.indexOf(card.sport.toUpperCase()) >= 0
      : false
  const topSport = profile.preferredSports[0]
  const isTopSport = !!topSport && card.sport?.toUpperCase() === topSport
  if (isTopSport) score += 3
  else if (sportMatch) score += 2
  else if (profile.preferredSports.length === 0) score += 1

  const typeMatch =
    (card.source === "bracket" && profile.hasBracketLeagues) ||
    (card.source === "creator" && profile.hasCreatorLeagues)
  if (typeMatch) score += 2
  else if (!profile.hasBracketLeagues && !profile.hasCreatorLeagues) score += 1

  const sizeMatch = profile.preferredTeamCounts.some(
    (n) => card.teamCount > 0 && Math.abs(card.teamCount - n) <= 2
  )
  if (sizeMatch) score += 1

  const notFull = card.maxMembers <= 0 || card.memberCount < card.maxMembers
  if (notFull) {
    const fillPct = card.fillPct ?? 0
    if (fillPct >= 50 && fillPct < 100) score += 2
    else if (fillPct < 50) score += 1
  }

  return score
}

/** Build a short deterministic explanation for a recommendation. */
function buildExplanation(card: DiscoveryCard, profile: UserLeagueProfile): string {
  const parts: string[] = []
  const topSport = profile.preferredSports[0]
  if (topSport && card.sport?.toUpperCase() === topSport) {
    parts.push("Matches your favorite sport")
  } else if (profile.preferredSports.length > 0 && card.sport) {
    const inList = profile.preferredSports.includes(card.sport.toUpperCase())
    if (inList) parts.push("Sport you play")
  }
  if (card.source === "bracket" && profile.hasBracketLeagues) {
    parts.push("Similar to your bracket leagues")
  }
  if (card.source === "creator" && profile.hasCreatorLeagues) {
    parts.push("Like your creator leagues")
  }
  if (card.teamCount > 0 && profile.preferredTeamCounts.some((n) => Math.abs(card.teamCount - n) <= 2)) {
    parts.push("Right size for you")
  }
  if (card.maxMembers > 0 && card.memberCount < card.maxMembers) {
    const pct = card.fillPct ?? 0
    if (pct >= 50) parts.push("Filling up — join soon")
    else parts.push("Open spots")
  }
  if (parts.length === 0) return "Recommended for you"
  return parts.slice(0, 2).join(" · ")
}

/**
 * Get personalized league recommendations for a user.
 * Deterministic scoring; optional AI-enhanced explanations can be layered later.
 */
export async function getPersonalizedRecommendations(
  userId: string,
  baseUrl: string = DEFAULT_BASE_URL,
  options: { limit?: number; sport?: string | null; viewerTier?: number | null; viewerIsAdmin?: boolean } = {}
): Promise<RecommendedLeagueWithExplanation[]> {
  const limit = Math.min(24, Math.max(1, options.limit ?? 6))
  const [profile, pool] = await Promise.all([
    getUserLeagueProfile(userId),
    getDiscoverableLeaguesPool(baseUrl, {
      sport: options.sport ?? null,
      maxTotal: 100,
      viewerContext: {
        viewerTier: options.viewerTier ?? null,
        viewerUserId: userId,
        viewerIsAdmin: options.viewerIsAdmin === true,
      },
    }),
  ])

  const excludeIds = new Set([
    ...profile.bracketLeagueIds.map((id) => `bracket-${id}`),
    ...profile.creatorLeagueIds.map((id) => `creator-${id}`),
  ])

  const scored = pool
    .filter((c) => !excludeIds.has(`${c.source}-${c.id}`))
    .filter((c) => c.maxMembers <= 0 || c.memberCount < c.maxMembers)
    .map((card) => ({
      card,
      score: scoreLeague(card, profile),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored.map(({ card, score }) => ({
    league: card,
    explanation: buildExplanation(card, profile),
    score,
  }))
}

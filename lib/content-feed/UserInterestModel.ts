import { prisma } from "@/lib/prisma"
import { getSettingsProfile } from "@/lib/user-settings/SettingsQueryService"
import { normalizeToSupportedSport, isSupportedSport } from "@/lib/sport-scope"
import type { FeedItemType, UserInterests } from "./types"

const FEED_LOOKBACK_DAYS = 30

const EVENT_TO_FEED_TYPES: Record<string, FeedItemType[]> = {
  league_view: ["league_update", "league_recap_card", "matchup_card"],
  bracket_view: ["community_highlight", "bracket_highlight_card"],
  trade_analyzer: ["ai_insight", "ai_story_card"],
  waiver_ai: ["ai_insight", "trend_alert"],
  mock_draft: ["community_highlight", "matchup_card"],
  chimmy_chat: ["ai_insight", "ai_story_card"],
  ai_used: ["ai_insight"],
}

/**
 * Derives user interests from profile (preferred sports) and league memberships (bracket + app).
 * Used by FeedRankingResolver to personalize feed order.
 */
export async function getUserInterests(userId: string): Promise<{
  sports: string[]
  leagueIds: string[]
  creatorLeagueIds?: string[]
  preferredFeedTypes?: FeedItemType[]
}> {
  const since = new Date()
  since.setDate(since.getDate() - FEED_LOOKBACK_DAYS)

  const [profile, bracketMemberships, creatorMemberships, ownedLeagues, rosterMemberships, recentEngagementEvents] = await Promise.all([
    getSettingsProfile(userId),
    (prisma as any).bracketLeagueMember
      .findMany({
        where: { userId },
        select: { leagueId: true },
      })
      .catch(() => []),
    (prisma as any).creatorLeagueMember
      .findMany({
        where: { userId },
        select: { creatorLeagueId: true },
      })
      .catch(() => []),
    (prisma as any).league
      .findMany({
        where: { userId },
        select: { id: true, sport: true },
      })
      .catch(() => []),
    (prisma as any).roster
      .findMany({
        where: { platformUserId: userId },
        select: { leagueId: true },
      })
      .catch(() => []),
    (prisma as any).engagementEvent
      .findMany({
        where: { userId, createdAt: { gte: since } },
        select: { eventType: true },
        orderBy: { createdAt: "desc" },
        take: 120,
      })
      .catch(() => []),
  ])

  const sports: string[] = []
  const rawSports = profile?.preferredSports
  if (Array.isArray(rawSports)) {
    for (const s of rawSports) {
      if (typeof s !== "string" || !s.trim()) continue
      const normalized = normalizeToSupportedSport(s)
      if (isSupportedSport(normalized)) sports.push(normalized)
    }
  }

  const leagueIds: string[] = bracketMemberships.map((m: { leagueId: string }) => m.leagueId)
  for (const row of rosterMemberships) {
    const leagueId = String((row as { leagueId?: string }).leagueId ?? "").trim()
    if (leagueId && !leagueIds.includes(leagueId)) leagueIds.push(leagueId)
  }
  for (const league of ownedLeagues) {
    const leagueId = String((league as { id?: string }).id ?? "").trim()
    if (leagueId && !leagueIds.includes(leagueId)) leagueIds.push(leagueId)
    const sport = String((league as { sport?: string }).sport ?? "").trim()
    if (sport) {
      const normalized = normalizeToSupportedSport(sport)
      if (isSupportedSport(normalized)) sports.push(normalized)
    }
  }

  const preferredFeedTypeScores = new Map<FeedItemType, number>()
  for (const event of recentEngagementEvents) {
    const eventType = String((event as { eventType?: string }).eventType ?? "")
    const mappedTypes = EVENT_TO_FEED_TYPES[eventType]
    if (!mappedTypes) continue
    for (const feedType of mappedTypes) {
      preferredFeedTypeScores.set(feedType, (preferredFeedTypeScores.get(feedType) ?? 0) + 1)
    }
  }
  const preferredFeedTypes = Array.from(preferredFeedTypeScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([feedType]) => feedType)

  const creatorLeagueIds = creatorMemberships.map(
    (m: { creatorLeagueId: string }) => m.creatorLeagueId
  )

  const result: UserInterests = {
    sports: [...new Set(sports)],
    leagueIds: [...new Set(leagueIds)],
    creatorLeagueIds: creatorLeagueIds.length > 0 ? creatorLeagueIds : undefined,
    preferredFeedTypes: preferredFeedTypes.length > 0 ? preferredFeedTypes : undefined,
  }

  return {
    ...result,
  }
}

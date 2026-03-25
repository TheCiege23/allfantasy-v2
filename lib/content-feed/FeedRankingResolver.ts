import type { ContentFeedItem, FeedMode, UserInterests } from "./types"

/**
 * Scores and sorts feed items by mode (following | for_you | trending), user interests, and recency.
 */
export function rankFeedItems(
  items: ContentFeedItem[],
  interests: UserInterests,
  mode: FeedMode = "for_you"
): ContentFeedItem[] {
  const now = Date.now()
  const leagueSet = new Set(interests.leagueIds)
  const creatorLeagueSet = new Set(interests.creatorLeagueIds ?? [])
  const sportSet = new Set(interests.sports.map((s) => s.toUpperCase()))
  const preferredTypeSet = new Set(interests.preferredFeedTypes ?? [])

  function recencyScore(createdAtIso: string): number {
    const ageMs = now - new Date(createdAtIso).getTime()
    const ageHours = ageMs / (60 * 60 * 1000)
    if (ageHours < 1) return 28
    if (ageHours < 6) return 20
    if (ageHours < 24) return 14
    if (ageHours < 72) return 8
    if (ageHours < 168) return 4
    return 1
  }

  const scored = items.map((item) => {
    let score = 0

    if (mode === "following") {
      if (item.sourceId && creatorLeagueSet.has(item.sourceId)) score += 50
      if (item.type === "creator_post" && item.creatorId) score += 25
      if (item.leagueId && leagueSet.has(item.leagueId)) score += 30
      if (item.type === "creator_post" || item.type === "community_highlight") score += 8
    } else if (mode === "trending") {
      score += recencyScore(item.createdAt)
      if (item.type === "trend_alert" || item.type === "blog_preview") score += 10
      if (item.type === "community_highlight") score += 6
    } else {
      if (item.sport && sportSet.has(item.sport.toUpperCase())) score += 20
      if (item.leagueId && leagueSet.has(item.leagueId)) score += 30
      if (item.sourceId && creatorLeagueSet.has(item.sourceId)) score += 25
      if (item.type === "player_news" || item.type === "league_update") score += 6
    }

    score += recencyScore(item.createdAt)
    if (preferredTypeSet.has(item.type)) score += 14
    if (
      item.type === "ai_insight" ||
      item.type === "ai_story_card" ||
      item.type === "power_rankings_card"
    )
      score += 5
    if (item.type === "community_highlight") score += 3

    return { ...item, score }
  })

  return scored.sort((a, b) => {
    const scoreDiff = (b.score ?? 0) - (a.score ?? 0)
    if (scoreDiff !== 0) return scoreDiff
    const createdAtDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (createdAtDiff !== 0) return createdAtDiff
    return a.id.localeCompare(b.id)
  })
}

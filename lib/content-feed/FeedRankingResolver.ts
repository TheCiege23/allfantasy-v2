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

  const scored = items.map((item) => {
    let score = 0

    if (mode === "following") {
      if (item.sourceId && creatorLeagueSet.has(item.sourceId)) score += 50
      if (item.type === "creator_post" && item.creatorId) score += 25
      if (item.leagueId && leagueSet.has(item.leagueId)) score += 30
    } else if (mode === "trending") {
      const ageMs = now - new Date(item.createdAt).getTime()
      const ageHours = ageMs / (60 * 60 * 1000)
      if (ageHours < 1) score += 25
      else if (ageHours < 6) score += 18
      else if (ageHours < 24) score += 12
      else if (ageHours < 168) score += 5
      if (item.type === "trend_alert" || item.type === "blog_preview") score += 10
    } else {
      if (item.sport && sportSet.has(item.sport.toUpperCase())) score += 20
      if (item.leagueId && leagueSet.has(item.leagueId)) score += 30
      if (item.sourceId && creatorLeagueSet.has(item.sourceId)) score += 25
    }

    const ageMs = now - new Date(item.createdAt).getTime()
    const ageHours = ageMs / (60 * 60 * 1000)
    if (ageHours < 1) score += 15
    else if (ageHours < 24) score += 10
    else if (ageHours < 168) score += 5
    if (
      item.type === "ai_insight" ||
      item.type === "ai_story_card" ||
      item.type === "power_rankings_card"
    )
      score += 5

    return { ...item, score }
  })

  return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
}

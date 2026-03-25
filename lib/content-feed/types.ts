/**
 * Fantasy content feed — unified item types for platform feed (PROMPT 148).
 */

export type FeedItemType =
  | "player_news"
  | "league_update"
  | "ai_insight"
  | "community_highlight"
  | "creator_post"
  | "ai_story_card"
  | "power_rankings_card"
  | "trend_alert"
  | "blog_preview"
  | "league_recap_card"
  | "bracket_highlight_card"
  | "matchup_card"

export type FeedMode = "following" | "for_you" | "trending"

export interface ContentFeedItem {
  id: string
  type: FeedItemType
  title: string
  body: string
  /** Deep link for article / detail. */
  href: string
  sport: string | null
  leagueId: string | null
  leagueName: string | null
  imageUrl?: string | null
  score?: number
  createdAt: string
  sourceId?: string
  sourceType?: "media_article" | "sports_news" | "bracket_feed" | "ai_generated" | "blog_article" | "creator_league" | "trend_feed" | "rankings"
  /** For creator_post: creator profile link and follow CTA. */
  creatorId?: string | null
  creatorHandle?: string | null
  creatorDisplayName?: string | null
  creatorAvatarUrl?: string | null
}

export interface UserInterests {
  sports: string[]
  leagueIds: string[]
  creatorLeagueIds?: string[]
  preferredFeedTypes?: FeedItemType[]
}

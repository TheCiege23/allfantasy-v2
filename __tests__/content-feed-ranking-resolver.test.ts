import { describe, expect, it } from "vitest"
import { rankFeedItems } from "@/lib/content-feed"
import type { ContentFeedItem, UserInterests } from "@/lib/content-feed"

const NOW = Date.now()

function hoursAgo(hours: number): string {
  return new Date(NOW - hours * 60 * 60 * 1000).toISOString()
}

describe("FeedRankingResolver", () => {
  it("prioritizes league + sport + preferred feed type for for_you ranking", () => {
    const items: ContentFeedItem[] = [
      {
        id: "generic-news",
        type: "player_news",
        title: "Generic news",
        body: "",
        href: "/news",
        sport: "NFL",
        leagueId: null,
        leagueName: null,
        createdAt: hoursAgo(1),
      },
      {
        id: "league-update",
        type: "league_update",
        title: "League update",
        body: "",
        href: "/app/league/league-1",
        sport: "NFL",
        leagueId: "league-1",
        leagueName: "League One",
        createdAt: hoursAgo(5),
      },
      {
        id: "preferred-ai",
        type: "ai_insight",
        title: "AI recommendation",
        body: "",
        href: "/chimmy",
        sport: "NFL",
        leagueId: "league-1",
        leagueName: "League One",
        createdAt: hoursAgo(8),
      },
    ]

    const interests: UserInterests = {
      sports: ["NFL"],
      leagueIds: ["league-1"],
      preferredFeedTypes: ["ai_insight"],
    }

    const ranked = rankFeedItems(items, interests, "for_you")
    expect(ranked[0]?.id).toBe("preferred-ai")
    expect((ranked[0]?.score ?? 0)).toBeGreaterThan(ranked[1]?.score ?? 0)
  })

  it("favors freshest trend/blog style cards in trending mode", () => {
    const items: ContentFeedItem[] = [
      {
        id: "older-trend",
        type: "trend_alert",
        title: "Old trend",
        body: "",
        href: "/trend",
        sport: "NBA",
        leagueId: null,
        leagueName: null,
        createdAt: hoursAgo(30),
      },
      {
        id: "fresh-trend",
        type: "trend_alert",
        title: "Fresh trend",
        body: "",
        href: "/trend",
        sport: "NBA",
        leagueId: null,
        leagueName: null,
        createdAt: hoursAgo(0.2),
      },
      {
        id: "fresh-highlight",
        type: "community_highlight",
        title: "Fresh highlight",
        body: "",
        href: "/community",
        sport: null,
        leagueId: null,
        leagueName: null,
        createdAt: hoursAgo(0.2),
      },
    ]

    const ranked = rankFeedItems(items, { sports: [], leagueIds: [] }, "trending")
    expect(ranked[0]?.id).toBe("fresh-trend")
    expect((ranked[0]?.score ?? 0)).toBeGreaterThan(ranked[1]?.score ?? 0)
  })
})

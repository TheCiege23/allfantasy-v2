import { expect, test } from "@playwright/test"

type MockFeedItem = {
  id: string
  type:
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
  title: string
  body: string
  href: string
  sport: string | null
  leagueId: string | null
  leagueName: string | null
  createdAt: string
  creatorId?: string | null
  creatorHandle?: string | null
}

test.describe("@feed fantasy content feed ranking regression", () => {
  test.describe.configure({ timeout: 180_000 })

  test("tab + filter combinations preserve expected feed ranking behavior", async ({ page }) => {
    const requests: Array<{
      tab: string
      sport: string | null
      contentType: string | null
      track: string | null
    }> = []

    const now = new Date()
    const iso = (minutesAgo: number) =>
      new Date(now.getTime() - minutesAgo * 60 * 1000).toISOString()

    const itemsForTab = (tab: string): MockFeedItem[] => {
      if (tab === "following") {
        return [
          {
            id: "following-creator-alpha",
            type: "creator_post",
            title: "Following: Creator Alpha post",
            body: "Creator alpha dropped a new league strategy update.",
            href: "/e2e/content-feed?following=alpha",
            sport: "NFL",
            leagueId: "league-creator-1",
            leagueName: "Alpha League",
            createdAt: iso(3),
            creatorId: "creator-1",
            creatorHandle: "alpha",
          },
          {
            id: "following-league-update",
            type: "league_update",
            title: "Following: League activity pulse",
            body: "Waiver activity increased overnight.",
            href: "/e2e/content-feed?following=league",
            sport: "NFL",
            leagueId: "league-1",
            leagueName: "League One",
            createdAt: iso(9),
          },
        ]
      }
      if (tab === "trending") {
        return [
          {
            id: "trending-fresh-trend",
            type: "trend_alert",
            title: "Trending: Fresh trend alert",
            body: "Immediate market movement detected.",
            href: "/e2e/content-feed?trending=trend",
            sport: "NBA",
            leagueId: null,
            leagueName: null,
            createdAt: iso(1),
          },
          {
            id: "trending-blog",
            type: "blog_preview",
            title: "Trending: Blog rising fast",
            body: "Top strategic read this hour.",
            href: "/e2e/content-feed?trending=blog",
            sport: "NBA",
            leagueId: null,
            leagueName: null,
            createdAt: iso(2),
          },
          {
            id: "trending-community",
            type: "community_highlight",
            title: "Trending: Community highlight",
            body: "Most discussed outcome in brackets.",
            href: "/e2e/content-feed?trending=community",
            sport: null,
            leagueId: null,
            leagueName: null,
            createdAt: iso(4),
          },
        ]
      }
      return [
        {
          id: "for-you-league-priority",
          type: "league_update",
          title: "For You: League priority update",
          body: "Your league has a high-impact waiver decision.",
          href: "/e2e/content-feed?forYou=league",
          sport: "NFL",
          leagueId: "league-1",
          leagueName: "League One",
          createdAt: iso(5),
        },
        {
          id: "for-you-ai-story",
          type: "ai_story_card",
          title: "For You: AI story card",
          body: "AI generated a personalized matchup angle.",
          href: "/e2e/content-feed?forYou=ai",
          sport: "NFL",
          leagueId: "league-1",
          leagueName: "League One",
          createdAt: iso(7),
        },
        {
          id: "for-you-player-news-nba",
          type: "player_news",
          title: "For You: NBA player news",
          body: "NBA injury update with lineup impact.",
          href: "/e2e/content-feed?forYou=news",
          sport: "NBA",
          leagueId: null,
          leagueName: null,
          createdAt: iso(8),
        },
      ]
    }

    await page.route("**/api/content-feed?**", async (route) => {
      const url = new URL(route.request().url())
      const tab = url.searchParams.get("tab") ?? "for_you"
      const sport = url.searchParams.get("sport")
      const contentType = url.searchParams.get("contentType")
      const track = url.searchParams.get("track")
      requests.push({ tab, sport, contentType, track })

      let items = itemsForTab(tab)
      if (sport) {
        items = items.filter((item) => item.sport === sport)
      }
      if (contentType) {
        items = items.filter((item) => item.type === contentType)
      }
      if (track === "feed_refresh") {
        items = items.map((item) => ({
          ...item,
          title: `Refreshed • ${item.title}`,
        }))
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items }),
      })
    })

    const order = async () =>
      page
        .locator("[data-feed-id]")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-feed-id") || ""))

    await page.goto("/e2e/content-feed")
    await expect(page.getByTestId("content-feed-page")).toBeVisible()
    await expect
      .poll(() => requests.some((req) => req.tab === "for_you" && req.track === "feed_view"))
      .toBeTruthy()
    await expect(page.getByText(/for you: league priority update/i)).toBeVisible()
    await expect.poll(order).toContain("for-you-league-priority")

    await page.getByTestId("content-feed-tab-trending").click()
    await expect
      .poll(() => requests.some((req) => req.tab === "trending" && req.track === "feed_view"))
      .toBeTruthy()
    await expect(page.getByText(/trending: fresh trend alert/i)).toBeVisible()
    await expect.poll(async () => (await order())[0]).toBe("trending-fresh-trend")

    await page.getByTestId("content-feed-tab-following").click()
    await expect
      .poll(() => requests.some((req) => req.tab === "following" && req.track === "feed_view"))
      .toBeTruthy()
    await expect(page.getByText(/following: creator alpha post/i)).toBeVisible()
    await expect.poll(async () => (await order())[0]).toBe("following-creator-alpha")

    await page.getByTestId("content-feed-tab-for_you").click()
    await page.getByTestId("content-feed-sport-filter-NBA").click()
    await expect
      .poll(() =>
        requests.some(
          (req) => req.tab === "for_you" && req.sport === "NBA" && req.track === "feed_view"
        )
      )
      .toBeTruthy()
    await expect(page.getByText(/for you: nba player news/i)).toBeVisible()
    await expect(page.getByText(/for you: league priority update/i)).toHaveCount(0)

    await page.getByTestId("content-feed-sport-filter-all").click()
    await page.getByTestId("content-feed-type-filter-ai_story_card").click()
    await expect
      .poll(() =>
        requests.some(
          (req) =>
            req.tab === "for_you" &&
            req.contentType === "ai_story_card" &&
            req.track === "feed_view"
        )
      )
      .toBeTruthy()
    await expect(page.getByText(/for you: ai story card/i)).toBeVisible()

    await page.getByTestId("content-feed-refresh-button").click()
    await expect
      .poll(() =>
        requests.some(
          (req) =>
            req.tab === "for_you" &&
            req.contentType === "ai_story_card" &&
            req.track === "feed_refresh"
        )
      )
      .toBeTruthy()
    await expect(page.getByText(/refreshed • for you: ai story card/i)).toBeVisible()
  })
})

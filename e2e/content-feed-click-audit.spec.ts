import { expect, test } from "@playwright/test"

test.describe("@feed fantasy content feed click audit", () => {
  test.describe.configure({ timeout: 180_000 })

  test("refresh button, article links, and AI insight cards are wired", async ({ page }) => {
    let feedRequestCount = 0
    const tracks: string[] = []

    await page.route("**/api/content-feed?**", async (route) => {
      feedRequestCount += 1
      const url = new URL(route.request().url())
      const track = url.searchParams.get("track") ?? ""
      tracks.push(track)

      const firstPayload = {
        items: [
          {
            id: "news-1",
            type: "player_news",
            title: "Daily player news: starter returns to practice",
            body: "Player update for daily fantasy prep.",
            href: "/e2e/content-feed?article=1",
            sport: "NFL",
            leagueId: null,
            leagueName: null,
            createdAt: new Date().toISOString(),
          },
          {
            id: "league-1",
            type: "league_update",
            title: "League update: waiver bids processed",
            body: "Top claims resolved overnight.",
            href: "/e2e/content-feed?article=2",
            sport: "NFL",
            leagueId: "league-1",
            leagueName: "Audit League",
            createdAt: new Date().toISOString(),
          },
          {
            id: "ai-1",
            type: "ai_insight",
            title: "AI recommendation: target upside on waivers",
            body: "Prioritize high-volume role shifts before lock.",
            href: "/e2e/content-feed?ai=1",
            sport: "NFL",
            leagueId: null,
            leagueName: null,
            createdAt: new Date().toISOString(),
          },
          {
            id: "community-1",
            type: "community_highlight",
            title: "Community highlight: comeback of the week",
            body: "League chatter is heating up.",
            href: "/e2e/content-feed?article=3",
            sport: "NFL",
            leagueId: null,
            leagueName: null,
            createdAt: new Date().toISOString(),
          },
        ],
      }

      const refreshPayload = {
        items: [
          {
            id: "news-2",
            type: "player_news",
            title: "Updated daily player news: waiver wire pulse",
            body: "Fresh update after feed refresh.",
            href: "/e2e/content-feed?article=4",
            sport: "NFL",
            leagueId: null,
            leagueName: null,
            createdAt: new Date().toISOString(),
          },
          {
            id: "ai-2",
            type: "ai_insight",
            title: "AI recommendation: lean into matchup leverage",
            body: "AI insight refreshed for today.",
            href: "/e2e/content-feed?ai=2",
            sport: "NFL",
            leagueId: null,
            leagueName: null,
            createdAt: new Date().toISOString(),
          },
        ],
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(track === "feed_refresh" ? refreshPayload : firstPayload),
      })
    })

    await page.goto("/e2e/content-feed")
    await expect(page.getByRole("heading", { name: /e2e content feed harness/i })).toBeVisible()
    await expect(page.getByTestId("content-feed-page")).toBeVisible()
    await expect(page.getByTestId("content-feed-title")).toBeVisible()

    await expect(page.getByTestId("content-feed-refresh-button")).toBeVisible()
    await expect(page.getByTestId("content-feed-article-link-news-1")).toBeVisible()
    await expect(page.getByTestId("content-feed-article-link-league-1")).toBeVisible()
    await expect(page.getByTestId("content-feed-ai-insight-card-ai-1")).toBeVisible()

    await expect(page.getByTestId("content-feed-article-link-news-1")).toHaveAttribute(
      "href",
      /\/e2e\/content-feed\?article=1/
    )
    await expect(page.getByTestId("content-feed-ai-insight-card-ai-1")).toHaveAttribute(
      "href",
      /\/e2e\/content-feed\?ai=1/
    )

    await page.getByTestId("content-feed-article-link-news-1").click()
    await expect(page).toHaveURL(/\/e2e\/content-feed\?article=1/, { timeout: 20_000 })
    await page.goto("/e2e/content-feed")

    await page.getByTestId("content-feed-ai-insight-card-ai-1").click()
    await expect(page).toHaveURL(/\/e2e\/content-feed\?ai=1/, { timeout: 20_000 })
    await page.goto("/e2e/content-feed")

    await expect(page.getByText(/daily player news: starter returns to practice/i)).toBeVisible()
    await page.getByTestId("content-feed-refresh-button").click()
    await expect.poll(() => feedRequestCount).toBeGreaterThan(1)
    await expect(page.getByText(/updated daily player news: waiver wire pulse/i)).toBeVisible()
    await expect(page.getByTestId("content-feed-ai-insight-card-ai-2")).toBeVisible()

    expect(tracks.includes("feed_view")).toBeTruthy()
    expect(tracks.includes("feed_refresh")).toBeTruthy()
  })
})

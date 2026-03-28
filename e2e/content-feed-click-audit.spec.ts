import { expect, test } from "@playwright/test"

test.describe("@feed fantasy content feed click audit", () => {
  test.describe.configure({ timeout: 180_000 })

  test("tabs, links, filters, refresh, follow, save and feed actions are wired", async ({ page }) => {
    const requests: Array<{
      tab: string
      sport: string | null
      contentType: string | null
      track: string | null
    }> = []

    const now = new Date().toISOString()
    const baseItems = (tab: string) => {
      if (tab === "following") {
        return [
          {
            id: "creator_alpha",
            type: "creator_post",
            title: "Creator Alpha: weekly strategy post",
            body: "Follow creator insights for this week.",
            href: "/creators/alpha",
            sport: "NFL",
            leagueId: "creator-league-1",
            leagueName: "Alpha League",
            createdAt: now,
            creatorId: "creator-1",
            creatorHandle: "alpha",
            creatorDisplayName: "Creator Alpha",
          },
          {
            id: "recap_following",
            type: "league_recap_card",
            title: "League recap: Monday update",
            body: "Top recap from your followed leagues.",
            href: "/app/league/league-1/news/recap-1",
            sport: "NFL",
            leagueId: "league-1",
            leagueName: "Audit League",
            createdAt: now,
          },
        ]
      }
      if (tab === "trending") {
        return [
          {
            id: "trend_trending",
            type: "trend_alert",
            title: "Trending: breakout alert",
            body: "Latest trend alert for high-upside players.",
            href: "/app/trend-feed?sport=SOCCER",
            sport: "SOCCER",
            leagueId: null,
            leagueName: null,
            createdAt: now,
          },
          {
            id: "bracket_trending",
            type: "bracket_highlight_card",
            title: "Bracket highlight card",
            body: "Bracket momentum card in trending.",
            href: "/brackets",
            sport: null,
            leagueId: null,
            leagueName: null,
            createdAt: now,
          },
        ]
      }
      return [
        {
          id: "creator_alpha",
          type: "creator_post",
          title: "Creator Alpha: market mover post",
          body: "Creator post blended into for-you feed.",
          href: "/creators/alpha",
          sport: "NFL",
          leagueId: "creator-league-1",
          leagueName: "Alpha League",
          createdAt: now,
          creatorId: "creator-1",
          creatorHandle: "alpha",
          creatorDisplayName: "Creator Alpha",
        },
        {
          id: "ai_story_soccer",
          type: "ai_story_card",
          title: "AI story card: soccer angle",
          body: "AI story card blend sample.",
          href: "/chimmy",
          sport: "SOCCER",
          leagueId: null,
          leagueName: null,
          createdAt: now,
        },
        {
          id: "rank_card_nba",
          type: "power_rankings_card",
          title: "Power rankings card",
          body: "Power rankings destination check.",
          href: "/app/power-rankings",
          sport: "NBA",
          leagueId: null,
          leagueName: null,
          createdAt: now,
        },
        {
          id: "blog_soccer_1",
          type: "blog_preview",
          title: "Blog preview: soccer recap",
          body: "Blog preview card destination check.",
          href: "/blog/soccer-recap",
          sport: "SOCCER",
          leagueId: null,
          leagueName: null,
          createdAt: now,
        },
        {
          id: "matchup_nfl_1",
          type: "matchup_card",
          title: "Matchup card: week outlook",
          body: "Matchup card destination check.",
          href: "/app/home",
          sport: "NFL",
          leagueId: "league-1",
          leagueName: "Audit League",
          createdAt: now,
        },
      ]
    }

    await page.addInitScript(() => {
      ;(window as any).__feedLinkClicks = []
      ;(window as any).__feedFollowAssigned = []
      document.addEventListener(
        "click",
        (event) => {
          const target = event.target as HTMLElement | null
          const anchor = target?.closest(
            "a[data-testid^='content-feed-article-link-'],a[data-testid^='content-feed-ai-insight-card-'],a[data-testid^='content-feed-view-creator-cta-']"
          ) as HTMLAnchorElement | null
          if (!anchor) return
          event.preventDefault()
          const href = anchor.getAttribute("href") ?? ""
          ;(window as any).__feedLinkClicks.push(href)
        },
        true
      )
      try {
        const originalAssign = window.location.assign.bind(window.location)
        ;(window as any).__feedOriginalAssign = originalAssign
        window.location.assign = ((url: string | URL) => {
          ;(window as any).__feedFollowAssigned.push(String(url))
        }) as typeof window.location.assign
      } catch {
        // ignore: browsers may lock location.assign
      }
    })

    await page.route("**/api/content-feed?**", async (route) => {
      const url = new URL(route.request().url())
      const tab = url.searchParams.get("tab") ?? "for_you"
      const sport = url.searchParams.get("sport")
      const contentType = url.searchParams.get("contentType")
      const track = url.searchParams.get("track")
      requests.push({ tab, sport, contentType, track })

      let items = baseItems(tab)
      if (sport) {
        items = items.filter((item) => item.sport === sport)
      }
      if (contentType) {
        items = items.filter((item) => item.type === contentType)
      }
      if (track === "feed_refresh") {
        items = items.map((item) => ({ ...item, title: `Refreshed • ${item.title}` }))
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items, tab, sport: sport ?? undefined, contentType: contentType ?? undefined }),
      })
    })

    await page.goto("/e2e/content-feed")
    await expect(page.getByTestId("content-feed-page")).toBeVisible()
    await expect(page.getByTestId("content-feed-title")).toBeVisible()
    await expect(page.getByTestId("content-feed-active-tab-title")).toHaveText(/for you/i)
    await expect
      .poll(() => requests.some((request) => request.tab === "for_you" && request.track === "feed_view"))
      .toBeTruthy()

    await page.getByTestId("content-feed-tab-following").click()
    await expect(page.getByTestId("content-feed-active-tab-title")).toHaveText("Following")
    await expect
      .poll(() => requests.some((request) => request.tab === "following" && request.track === "feed_view"))
      .toBeTruthy()

    await page.getByTestId("content-feed-tab-trending").click()
    await expect(page.getByTestId("content-feed-active-tab-title")).toHaveText("Trending")
    await expect
      .poll(() => requests.some((request) => request.tab === "trending" && request.track === "feed_view"))
      .toBeTruthy()

    await page.getByTestId("content-feed-tab-for_you").click()
    await expect(page.getByTestId("content-feed-active-tab-title")).toHaveText(/for you/i)

    await page.getByTestId("content-feed-sport-filter-SOCCER").click()
    await expect
      .poll(() =>
        requests.some(
          (request) =>
            request.tab === "for_you" &&
            request.sport === "SOCCER" &&
            request.track === "feed_view"
        )
      )
      .toBeTruthy()
    await expect(page.getByText(/soccer/i).first()).toBeVisible()

    await page.getByTestId("content-feed-type-filter-blog_preview").click()
    await expect
      .poll(() =>
        requests.some(
          (request) =>
            request.tab === "for_you" &&
            request.sport === "SOCCER" &&
            request.contentType === "blog_preview" &&
            request.track === "feed_view"
        )
      )
      .toBeTruthy()
    await expect(page.getByText(/blog preview: soccer recap/i)).toBeVisible()

    await page.getByTestId("content-feed-type-filter-all").click()
    await page.getByTestId("content-feed-sport-filter-all").click()

    await page.getByTestId("content-feed-article-link-blog_soccer_1").click()
    await page.getByTestId("content-feed-ai-insight-card-ai_story_soccer").click()
    await page.getByTestId("content-feed-article-link-matchup_nfl_1").click()
    await expect
      .poll(() => page.evaluate(() => (window as any).__feedLinkClicks.length as number))
      .toBeGreaterThan(2)
    const clickedLinks = await page.evaluate(() => (window as any).__feedLinkClicks as string[])
    expect(clickedLinks).toEqual(
      expect.arrayContaining([
        "/blog/soccer-recap",
        "/chimmy",
        "/app/home",
      ])
    )

    const deadActions = await page.evaluate(() => {
      const anchors = Array.from(
        document.querySelectorAll(
          "a[data-testid^='content-feed-article-link-'],a[data-testid^='content-feed-ai-insight-card-'],a[data-testid^='content-feed-view-creator-cta-']"
        )
      ) as HTMLAnchorElement[]
      return anchors
        .map((anchor) => anchor.getAttribute("href") ?? "")
        .filter((href) => !href || (!href.startsWith("/") && !href.startsWith("http://") && !href.startsWith("https://")))
    })
    expect(deadActions).toHaveLength(0)

    await page.getByTestId("content-feed-save-item-cta-creator_alpha").click()
    await expect(page.getByTestId("content-feed-save-item-cta-creator_alpha")).toContainText("Saved")
    await page.reload()
    await expect(page.getByTestId("content-feed-save-item-cta-creator_alpha")).toContainText("Saved")

    await page.getByTestId("content-feed-follow-creator-cta-creator_alpha").click()
    const assignedUrls = await page.evaluate(() => (window as any).__feedFollowAssigned as string[])
    if (Array.isArray(assignedUrls) && assignedUrls.length > 0) {
      expect(assignedUrls.some((url) => url.includes("/creators/alpha"))).toBeTruthy()
    } else {
      await expect(page).toHaveURL(/\/creators\/alpha/, { timeout: 20_000 })
      await page.goto("/e2e/content-feed")
    }

    await page.getByTestId("content-feed-refresh-button").click()
    await expect
      .poll(() =>
        requests.some(
          (request) =>
            request.tab === "for_you" && request.track === "feed_refresh"
        )
      )
      .toBeTruthy()
    await expect(page.getByText(/refreshed • creator alpha/i)).toBeVisible()
  })
})

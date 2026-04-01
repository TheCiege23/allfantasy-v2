import { expect, test } from "@playwright/test"

test.describe("@dashboard unified dashboard click audit", () => {
  test.describe.configure({ timeout: 210_000, mode: "serial" })

  test("audits unified dashboard cards, filters, expanders, and routing", async ({ page }) => {
    const soccerLeagueId = "soccer-e2e-123"
    const soccerLeagueName = "Soccer Dashboard Harness League"
    let leagueListCalls = 0

    await page.route("**/api/league/list", async (route) => {
      leagueListCalls += 1
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          leagues: [
            {
              id: soccerLeagueId,
              name: soccerLeagueName,
              sport: "SOCCER",
              sport_type: "SOCCER",
              leagueVariant: "STANDARD",
              league_variant: "STANDARD",
              platform: "manual",
              leagueSize: 12,
              isDynasty: false,
              syncStatus: "manual",
              rosters: [],
            },
          ],
        }),
      })
    })

    await page.route("**/api/league/roster**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ roster: [], faabRemaining: null, waiverPriority: null }),
      })
    })

    await page.route("**/api/bracket/leagues/**/standings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ standings: [] }),
      })
    })

    await page.route("**/api/bracket/leagues/**/chat", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: {
              id: "m1",
              message: "Test message",
              createdAt: new Date().toISOString(),
              user: { displayName: "Audit User", email: "audit@example.com" },
            },
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ messages: [] }),
      })
    })

    await page.route("**/api/content-feed**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: "a1",
              title: "League trend update",
              summary: "Waiver market heating up",
              href: "/app/home",
              type: "feed",
              publishedAt: new Date().toISOString(),
            },
          ],
        }),
      })
    })

    await page.route("**/api/sports/news**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          news: [
            {
              id: "n1",
              title: "Injury watch",
              source: "wire",
              publishedAt: new Date().toISOString(),
              url: "/fantasy-news",
            },
          ],
        }),
      })
    })

    await page.route("**/api/sports/weather**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          team: "KC",
          venue: "Arrowhead",
          isDome: false,
          weather: { summary: "Clear", tempF: 58, windMph: 6 },
          source: "openweathermap",
        }),
      })
    })

    await page.route(`**/api/leagues/${soccerLeagueId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: soccerLeagueId,
          name: soccerLeagueName,
          sport: "SOCCER",
          leagueVariant: "STANDARD",
          isDynasty: false,
        }),
      })
    })

    await page.route(`**/api/commissioner/leagues/${soccerLeagueId}/check**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ isCommissioner: false }),
      })
    })

    // Use deterministic dashboard harness for full click-audit interaction matrix.
    await page.goto("/e2e/dashboard-soccer-grouping")
    await expect(page.getByText(/Welcome back,/i).first()).toBeVisible()

    // Tabs + active state
    await page.locator('[data-dashboard-tab="Home"]').click()
    await expect(page.locator('[data-dashboard-tab="Home"][aria-pressed="true"]')).toBeVisible()
    await page.locator('[data-dashboard-tab="My Leagues"]').click()
    await expect(page.locator('[data-dashboard-tab="My Leagues"][aria-pressed="true"]')).toBeVisible()

    // Sport filter + collapse/expand behavior
    await page.locator('[data-sport-filter="SOCCER"]').click()
    await expect(page.locator(`[data-dashboard-sport-group="SOCCER"]`)).toBeVisible()
    const soccerGroup = page.locator(`[data-dashboard-sport-group="SOCCER"]`).first()
    await soccerGroup.getByRole("button", { name: /Collapse/i }).click()
    await expect(soccerGroup.getByRole("button", { name: /Expand/i })).toBeVisible()
    await soccerGroup.getByRole("button", { name: /Expand/i }).click()

    // Refresh leagues API wiring
    const beforeRefreshCalls = leagueListCalls
    await page.getByRole("button", { name: /Refresh/i }).first().click()
    await expect.poll(() => leagueListCalls).toBeGreaterThan(beforeRefreshCalls)

    // League card click
    const leagueCard = soccerGroup.getByRole("link", { name: new RegExp(soccerLeagueName) }).first()
    await expect(leagueCard).toHaveAttribute("href", new RegExp(`^/app/league/${soccerLeagueId}$`))
    await page.goto(`/app/league/${soccerLeagueId}`)
    await expect(page).toHaveURL(new RegExp(`/app/league/${soccerLeagueId}$`), { timeout: 20_000 })
    await page.goto("/e2e/dashboard-soccer-grouping")
    await expect(page).toHaveURL(/\/e2e\/dashboard-soccer-grouping/)

    // Home cards and current quick-action links
    await page.locator('[data-dashboard-tab="Home"]').click()
    await expect(page.getByRole("link", { name: /\+ Create League/i }).first()).toHaveAttribute("href", "/create-league")
    await expect(page.getByRole("link", { name: /📥 Import/i }).first()).toHaveAttribute("href", "/import")
    await expect(page.getByRole("link", { name: /🔍 Find League/i }).first()).toHaveAttribute("href", "/find-league")
    await expect(page.getByRole("link", { name: /How rankings work/i })).toHaveAttribute("href", "/rankings")
    await expect(page.getByRole("link", { name: /My Rankings/i }).first()).toHaveAttribute("href", "/rankings")
    await expect(page.getByRole("link", { name: /AI Tools/i }).first()).toHaveAttribute("href", "/tools-hub")

    // Settings access remains available from the rebuilt header / setup panel.
    await expect(page.locator('a[href="/settings"]').first()).toBeVisible()

    // AI widget button path
    await page.locator('[data-dashboard-tab="AI"]').click()
    await expect(page.getByRole("heading", { name: /^AI$/ })).toBeVisible()
    await expect(page.getByRole("link", { name: "Ask Chimmy" }).first()).toHaveAttribute(
      "href",
      /\/messages\?tab=ai.*leagueId=/
    )

    // Messages composer must expose an accessible send action and append the posted chat item.
    await page.locator('[data-dashboard-tab="Messages"]').click()
    await expect(page.getByRole("heading", { name: /^Messages$/ })).toBeVisible()
    await page.getByPlaceholder("Message the league").fill("Audit post body")
    await page.getByRole("button", { name: "Send league message" }).first().click()
    await expect(page.getByText("Test message")).toBeVisible()

    // Mobile stacked dashboard behavior
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/e2e/dashboard-soccer-grouping")
    const mobileBottomNav = page.locator("div.fixed")
    await expect(mobileBottomNav.getByRole("button", { name: "Leagues" })).toBeVisible()
    await expect(mobileBottomNav.getByRole("button", { name: "Messages" })).toBeVisible()
    await mobileBottomNav.getByRole("button", { name: "Tools" }).click()
    await expect(page.getByRole("heading", { name: /^Tools$/ })).toBeVisible()
  })
})

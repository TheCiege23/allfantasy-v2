import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 180_000 })

test.describe("@power-rankings click audit", () => {
  test("rankings tab and team card clicks are wired", async ({ page }) => {
    await page.route("**/api/leagues/league_rankings_1/power-rankings**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          leagueId: "league_rankings_1",
          leagueName: "Audit League",
          season: "2026",
          week: 8,
          computedAt: Date.now(),
          teams: [
            {
              rosterId: 1,
              ownerId: "owner-1",
              displayName: "Alpha Squad",
              username: "alpha",
              rank: 1,
              prevRank: 3,
              rankDelta: 2,
              record: { wins: 7, losses: 1, ties: 0 },
              pointsFor: 987.2,
              pointsAgainst: 842.1,
              composite: 92.1,
              powerScore: 92,
            },
            {
              rosterId: 2,
              ownerId: "owner-2",
              displayName: "Bravo Unit",
              username: "bravo",
              rank: 2,
              prevRank: 1,
              rankDelta: -1,
              record: { wins: 6, losses: 2, ties: 0 },
              pointsFor: 951.4,
              pointsAgainst: 876.7,
              composite: 88.5,
              powerScore: 89,
            },
          ],
        }),
      })
    })

    await page.goto("/e2e/power-rankings", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "Power Rankings Harness" })).toBeVisible()
    await expect(page.getByTestId("power-rankings-hydrated-flag")).toContainText("hydrated")

    const rankingsTab = page.getByTestId("league-tab-rankings")
    await expect(rankingsTab).toBeVisible()
    await rankingsTab.click()

    await expect(page.getByTestId("power-rankings-content")).toBeVisible()
    await expect(page.getByText("Week 8 Power Rankings")).toBeVisible()
    await expect(page.locator('[data-audit="movement-indicator"]')).toHaveCount(2)

    const teamCard = page.getByTestId("power-ranking-team-card-1")
    const teamLink = page.getByTestId("power-ranking-team-link-1")
    await expect(teamCard).toBeVisible()
    await expect(teamLink).toHaveAttribute("href", "/app/league/league_rankings_1?tab=Roster")

    await teamCard.click()
    await expect(page.getByText("Alpha Squad")).toBeVisible()
    await expect(page.getByText("7-1")).toBeVisible()
  })
})

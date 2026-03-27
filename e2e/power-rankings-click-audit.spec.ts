import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 180_000 })

test.describe("@power-rankings click audit", () => {
  test("audits team row, filters, refresh, and chimmy link wiring", async ({ page }) => {
    await page.addInitScript(() => {
      ;(window as any).__powerRankingsClicks = {
        chimmy: 0,
        roster: 0,
      }
      document.addEventListener(
        "click",
        (event) => {
          const target = event.target as HTMLElement | null
          if (!target) return
          const chimmy = target.closest?.('[data-testid="power-rankings-chimmy-explanation-link"]')
          if (chimmy) {
            ;(window as any).__powerRankingsClicks.chimmy += 1
            event.preventDefault()
            return
          }
          const roster = target.closest?.('[data-testid^="power-ranking-team-link-"]')
          if (roster) {
            ;(window as any).__powerRankingsClicks.roster += 1
            event.preventDefault()
          }
        },
        true
      )
    })

    const rankingRequests: Array<{ week: string | null }> = []

    await page.route("**/api/leagues/league_rankings_1/power-rankings**", async (route) => {
      const url = new URL(route.request().url())
      const week = url.searchParams.get("week")
      rankingRequests.push({ week })
      const resolvedWeek = week ? Number(week) : 8

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          leagueId: "league_rankings_1",
          leagueName: "Audit League",
          season: "2026",
          week: resolvedWeek,
          computedAt: Date.now(),
          formula: {
            recordWeight: 0.35,
            recentPerformanceWeight: 0.25,
            rosterStrengthWeight: 0.25,
            projectionStrengthWeight: 0.15,
          },
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
              strengthOfSchedule: 0.58,
              recentPerformanceScore: 82,
              rosterStrengthScore: 91,
              projectionStrengthScore: 79,
              rosterValue: 8420,
              expectedWins: 6.9,
              composite: 92.1,
              powerScore: 86.9,
              powerScoreBreakdown: {
                record: 84,
                recentPerformance: 82,
                rosterStrength: 91,
                projectionStrength: 79,
                weightedScore: 86.9,
              },
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
              strengthOfSchedule: 0.46,
              recentPerformanceScore: 67,
              rosterStrengthScore: 83,
              projectionStrengthScore: 72,
              rosterValue: 7900,
              expectedWins: 6.1,
              composite: 88.5,
              powerScore: 76.4,
              powerScoreBreakdown: {
                record: 72,
                recentPerformance: 67,
                rosterStrength: 83,
                projectionStrength: 72,
                weightedScore: 76.4,
              },
            },
            {
              rosterId: 3,
              ownerId: "owner-3",
              displayName: "Charlie Club",
              username: "charlie",
              rank: 3,
              prevRank: 2,
              rankDelta: -1,
              record: { wins: 5, losses: 3, ties: 0 },
              pointsFor: 915.2,
              pointsAgainst: 902.6,
              strengthOfSchedule: 0.52,
              recentPerformanceScore: 59,
              rosterStrengthScore: 70,
              projectionStrengthScore: 65,
              rosterValue: 7340,
              expectedWins: 5.4,
              composite: 81.2,
              powerScore: 67.4,
              powerScoreBreakdown: {
                record: 63,
                recentPerformance: 59,
                rosterStrength: 70,
                projectionStrength: 65,
                weightedScore: 67.4,
              },
            },
          ],
        }),
      })
    })

    await page.goto("/e2e/power-rankings", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "Power Rankings Harness" })).toBeVisible()
    await expect(page.getByTestId("power-rankings-hydrated-flag")).toContainText(/hydrat/i)

    const rankingsTab = page.getByTestId("league-tab-rankings")
    await expect(rankingsTab).toBeVisible()
    const rankingsContent = page.getByTestId("power-rankings-content")
    const rankingsHeader = page.getByText("Week 8 Power Rankings")
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await rankingsTab.click({ force: true }).catch(() => null)
      if (await rankingsContent.isVisible().catch(() => false)) break
      if (await rankingsHeader.isVisible().catch(() => false)) break
      await page.waitForTimeout(150 * (attempt + 1))
    }

    await expect
      .poll(
        async () =>
          (await rankingsContent.isVisible().catch(() => false)) ||
          (await rankingsHeader.isVisible().catch(() => false)),
        { timeout: 10_000 }
      )
      .toBe(true)
    await expect(page.getByText(/Week \d+ Power Rankings/)).toBeVisible()
    await expect(page.locator('[data-audit="movement-indicator"]')).toHaveCount(3)

    const weekFilter = page.getByTestId("power-rankings-week-filter")
    await weekFilter.click()
    await page.getByRole("option", { name: "Week 5" }).click()
    await expect.poll(() => rankingRequests.some((request) => request.week === "5")).toBeTruthy()
    await expect(page.getByText("Week 5 Power Rankings")).toBeVisible()

    const movementFilter = page.getByTestId("power-rankings-movement-filter")
    await movementFilter.click()
    await page.getByRole("option", { name: "Risers" }).click()
    await expect(page.getByTestId("power-ranking-team-card-1")).toBeVisible()
    await expect(page.getByTestId("power-ranking-team-card-2")).toHaveCount(0)
    await expect(page.getByTestId("power-ranking-team-card-3")).toHaveCount(0)

    const requestCountBeforeRefresh = rankingRequests.length
    await page.getByTestId("refresh-rankings-button").click()
    await expect.poll(() => rankingRequests.length).toBeGreaterThan(requestCountBeforeRefresh)

    const chimmyLink = page.getByTestId("power-rankings-chimmy-explanation-link")
    await expect(chimmyLink).toHaveAttribute("href", /\/messages\?tab=ai/)
    await chimmyLink.click({ force: true }).catch(() => null)
    await chimmyLink.evaluate((node) => (node as HTMLAnchorElement).click()).catch(() => null)
    await expect
      .poll(() =>
        page.evaluate(() => (window as any).__powerRankingsClicks?.chimmy ?? 0)
      )
      .toBeGreaterThan(0)
    await expect(page.getByTestId("power-rankings-content")).toBeVisible()

    const teamCard = page.getByTestId("power-ranking-team-card-1")
    const teamLink = page.getByTestId("power-ranking-team-link-1")
    await expect(teamCard).toBeVisible()
    await expect(teamLink).toHaveAttribute("href", "/app/league/league_rankings_1?tab=Roster&rosterId=1")
    await teamLink.click({ force: true }).catch(() => null)
    await teamLink.evaluate((node) => (node as HTMLAnchorElement).click()).catch(() => null)
    await expect
      .poll(() =>
        page.evaluate(() => (window as any).__powerRankingsClicks?.roster ?? 0)
      )
      .toBeGreaterThan(0)
  })
})

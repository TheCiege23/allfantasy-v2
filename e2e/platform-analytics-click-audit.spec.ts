import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 180_000 })

type RequestSnapshot = {
  from: string | null
  to: string | null
  sport: string | null
}

function buildDailySeries(from: string | null, to: string | null, base: number) {
  const start = from ? new Date(`${from}T00:00:00.000Z`) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const end = to ? new Date(`${to}T00:00:00.000Z`) : new Date()
  const out: Array<{ date: string; count: number }> = []
  for (let t = start.getTime(), i = 0; t <= end.getTime(); t += 24 * 60 * 60 * 1000, i += 1) {
    const day = new Date(t).toISOString().slice(0, 10)
    out.push({ date: day, count: base + i })
  }
  return out
}

function mockPayload(from: string | null, to: string | null, sport: string | null) {
  const normalizedSport = sport ?? "all"
  const seed = normalizedSport === "NFL" ? 70 : normalizedSport === "SOCCER" ? 55 : 110
  const series = buildDailySeries(from, to, Math.max(1, Math.floor(seed / 10)))
  return {
    userGrowth: {
      dau: seed,
      mau: seed * 3,
      signupsOverTime: series,
      activeUsersOverTime: series,
    },
    leagueGrowth: {
      totalLeagues: seed * 5,
      leaguesCreatedOverTime: series,
      bySport: [
        { sport: "NFL", count: 40 },
        { sport: "NHL", count: 12 },
        { sport: "NBA", count: 30 },
        { sport: "MLB", count: 18 },
        { sport: "NCAAB", count: 14 },
        { sport: "NCAAF", count: 10 },
        { sport: "SOCCER", count: 20 },
      ],
    },
    toolUsage: {
      byToolKey: [
        { toolKey: "trade-analyzer", count: seed + 9, uniqueUsers: Math.max(1, Math.floor(seed / 2)) },
        { toolKey: "waiver-wire", count: seed + 3, uniqueUsers: Math.max(1, Math.floor(seed / 3)) },
      ],
      eventsOverTime: series,
    },
    aiRequests: {
      total: seed + 11,
      uniqueUsers: Math.max(1, Math.floor(seed / 2)),
      overTime: series,
    },
    revenue: {
      totalCents: seed * 1000,
      transactionCount: Math.max(1, Math.floor(seed / 4)),
      overTime: series,
    },
    bracketParticipation: {
      totalEntries: seed * 2,
      totalLeagues: Math.max(1, Math.floor(seed / 2)),
      entriesOverTime: series,
    },
    draftActivity: {
      totalDrafts: Math.max(1, Math.floor(seed / 3)),
      uniqueUsers: Math.max(1, Math.floor(seed / 4)),
      overTime: series,
    },
    tradeVolume: {
      totalTrades: seed + 5,
      overTime: series,
    },
  }
}

test.describe("@admin platform analytics click audit", () => {
  test("analytics panel filters and exports are wired end-to-end", async ({ page }) => {
    const requests: RequestSnapshot[] = []

    await page.route("**/api/admin/analytics/platform**", async (route) => {
      const url = new URL(route.request().url())
      const from = url.searchParams.get("from")
      const to = url.searchParams.get("to")
      const sport = url.searchParams.get("sport")
      requests.push({ from, to, sport })
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockPayload(from, to, sport)),
      })
    })

    await page.goto("/e2e/platform-analytics", { waitUntil: "domcontentloaded" })
    const openButton = page.getByTestId("platform-analytics-open")
    const panel = page.getByTestId("platform-analytics-panel")
    for (let i = 0; i < 15; i += 1) {
      if (await panel.isVisible().catch(() => false)) break
      if (await openButton.isVisible().catch(() => false)) {
        await openButton.click().catch(() => {})
      }
      await page.waitForTimeout(250)
    }
    await expect(panel).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId("platform-analytics-user-growth")).toBeVisible()
    await expect(page.getByTestId("platform-analytics-league-growth")).toBeVisible()
    await expect(page.getByTestId("platform-analytics-tool-usage")).toBeVisible()
    await expect(page.getByTestId("platform-analytics-ai-requests")).toBeVisible()
    await expect(page.getByTestId("platform-analytics-revenue")).toBeVisible()

    await expect.poll(() => requests.length).toBeGreaterThan(0)
    await expect(page.getByTestId("platform-analytics-user-growth-dau")).toHaveText("110")

    await page.getByTestId("platform-analytics-preset-7d").click()
    await page.getByTestId("platform-analytics-sport-filter").selectOption("NFL")
    await page.getByTestId("platform-analytics-apply").click()
    await expect.poll(() => requests.some((r) => r.sport === "NFL")).toBe(true)
    await expect(page.getByTestId("platform-analytics-user-growth-dau")).toHaveText("70")
    await expect(page.getByTestId("platform-analytics-chart-user-growth")).toBeVisible()
    await expect(page.getByTestId("platform-analytics-chart-league-growth")).toBeVisible()
    await expect(page.getByTestId("platform-analytics-chart-tool-usage")).toBeVisible()
    await expect(page.getByTestId("platform-analytics-chart-ai-requests")).toBeVisible()
    await expect(page.getByTestId("platform-analytics-chart-revenue")).toBeVisible()

    await page.getByTestId("platform-analytics-date-from").fill("2026-01-01")
    await page.getByTestId("platform-analytics-date-to").fill("2026-01-10")
    await page.getByTestId("platform-analytics-sport-filter").selectOption("SOCCER")
    await page.getByTestId("platform-analytics-apply").click()
    await expect.poll(() => requests.some((r) => r.from === "2026-01-01" && r.to === "2026-01-10" && r.sport === "SOCCER")).toBe(true)
    await expect(page.getByTestId("platform-analytics-user-growth-dau")).toHaveText("55")

    await page.getByTestId("platform-analytics-export-user-growth").click()
    await page.getByTestId("platform-analytics-export-league-growth").click()
    await page.getByTestId("platform-analytics-export-tool-usage").click()
    await page.getByTestId("platform-analytics-export-ai-requests").click()
    await page.getByTestId("platform-analytics-export-revenue").click()
  })

  test("platform analytics API is permission-gated", async ({ page }) => {
    const res = await page.request.get("/api/admin/analytics/platform")
    expect(res.status()).toBe(401)
  })
})

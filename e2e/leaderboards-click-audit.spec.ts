import { expect, test } from "@playwright/test"

test.describe("@leaderboards click audit", () => {
  test("required leaderboard tabs are wired and render correctly", async ({ page }) => {
    const requestedBoards: string[] = []

    await page.route("**/api/leaderboards**", async (route) => {
      const url = new URL(route.request().url())
      const board = url.searchParams.get("board") ?? "draft_grades"
      requestedBoards.push(board)

      const entriesByBoard: Record<string, Array<{ rank: number; managerId: string; displayName: string; value: number; extra?: { count?: number; grade?: string } }>> = {
        draft_grades: [
          { rank: 1, managerId: "mgr-a", displayName: "Draft Ace", value: 96.4, extra: { count: 8, grade: "A" } },
          { rank: 2, managerId: "mgr-b", displayName: "Sleeper Scout", value: 93.1, extra: { count: 6, grade: "A-" } },
        ],
        championships: [
          { rank: 1, managerId: "mgr-c", displayName: "Ring Collector", value: 7, extra: { count: 7 } },
          { rank: 2, managerId: "mgr-d", displayName: "Dynasty Builder", value: 5, extra: { count: 5 } },
        ],
        win_pct: [
          { rank: 1, managerId: "mgr-e", displayName: "Steady Winner", value: 73.8, extra: { count: 11 } },
          { rank: 2, managerId: "mgr-f", displayName: "Clutch GM", value: 70.2, extra: { count: 9 } },
        ],
        active: [
          { rank: 1, managerId: "mgr-g", displayName: "Always Online", value: 212, extra: { count: 128, grade: "90 chat · 20 trade · 18 waiver" } },
          { rank: 2, managerId: "mgr-h", displayName: "Deal Maker", value: 175, extra: { count: 109, grade: "48 chat · 31 trade · 30 waiver" } },
        ],
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          entries: entriesByBoard[board] ?? entriesByBoard.draft_grades,
          total: 2,
          generatedAt: new Date().toISOString(),
        }),
      })
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/leaderboards", { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("leaderboards-page")).toBeVisible()
    await expect.poll(() => requestedBoards.includes("draft_grades")).toBe(true)
    await expect(page.getByTestId("leaderboards-current-board")).toContainText("Best draft grades")
    await expect(page.getByTestId("leaderboards-row-1")).toContainText("Draft Ace")

    await page.getByTestId("leaderboards-tab-championships").click()
    await expect.poll(() => requestedBoards.includes("championships")).toBe(true)
    await expect(page.getByTestId("leaderboards-current-board")).toContainText("Most championships")
    await expect(page.getByTestId("leaderboards-row-1")).toContainText("Ring Collector")

    await page.getByTestId("leaderboards-tab-win_pct").click()
    await expect.poll(() => requestedBoards.includes("win_pct")).toBe(true)
    await expect(page.getByTestId("leaderboards-current-board")).toContainText("Highest win %")
    await expect(page.getByTestId("leaderboards-row-1")).toContainText("73.8%")

    await page.getByTestId("leaderboards-tab-active").click()
    await expect.poll(() => requestedBoards.includes("active")).toBe(true)
    await expect(page.getByTestId("leaderboards-current-board")).toContainText("Most active managers")
    await expect(page.getByTestId("leaderboards-row-1")).toContainText("Always Online")
    await expect(page.getByTestId("leaderboards-row-1")).toContainText("128 actions")
  })
})

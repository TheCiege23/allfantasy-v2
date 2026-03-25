import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 180_000 })

test.describe("@player-comparison-lab click audit", () => {
  test("compare button, chart toggles, and AI insight button are wired", async ({ page }) => {
    const pageErrors: string[] = []
    page.on("pageerror", (err) => pageErrors.push(err.message))
    page.on("console", (msg) => {
      if (msg.type() === "error") pageErrors.push(msg.text())
    })

    await page.goto("/e2e/player-comparison-lab", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "Player Comparison Lab Harness" })).toBeVisible()
    await page.waitForTimeout(600)
    expect(pageErrors).toEqual([])

    const chart = page.getByTestId("player-comparison-side-by-side-chart")
    const compareButton = page.getByTestId("compare-player-button")
    for (let i = 0; i < 3; i += 1) {
      await compareButton.click()
      if (await chart.isVisible().catch(() => false)) break
      await page.waitForTimeout(400)
    }

    await expect(chart).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId("player-comparison-chart-series-count")).toContainText("Metrics: 6")

    await page.getByTestId("player-comparison-chart-toggle-historical").click()
    await expect(page.getByTestId("player-comparison-chart-series-count")).toContainText("Metrics: 2")

    await page.getByTestId("player-comparison-chart-toggle-projections").click()
    await expect(page.getByTestId("player-comparison-chart-series-count")).toContainText("Metrics: 4")

    await page.getByTestId("player-comparison-chart-toggle-both").click()
    await expect(page.getByTestId("player-comparison-chart-series-count")).toContainText("Metrics: 6")

    await page.getByTestId("ai-insight-button").click()
    await expect(
      page.getByText(/stronger blend of historical production and projection value/i)
    ).toBeVisible()
  })
})

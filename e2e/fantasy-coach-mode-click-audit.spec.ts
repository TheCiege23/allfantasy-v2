import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 120_000 })

test.describe("@coach fantasy coach mode click audit", () => {
  test("coach mode button and strategy explanation panel are wired", async ({ page }) => {
    await page.goto("/e2e/fantasy-coach-mode", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "Fantasy Coach Mode Harness" })).toBeVisible()
    await expect(page.getByTestId("fantasy-coach-hydrated-flag")).toContainText("hydrated")

    await expect(page.getByTestId("strategy-explanation-panel")).toHaveCount(0)

    await page.getByTestId("coach-advice-type-waiver").click()
    await page.getByTestId("coach-mode-button").click()

    const strategyPanel = page.getByTestId("strategy-explanation-panel")
    await expect(strategyPanel).toBeVisible()
    await expect(strategyPanel).toContainText("Waiver advice")
    await expect(strategyPanel).toContainText("Waiver edge")
    await expect(strategyPanel).toContainText("Your challenge")

    await page.getByTestId("coach-advice-type-trade").click()
    await expect(page.getByTestId("strategy-explanation-panel")).toHaveCount(0)
    await page.getByTestId("coach-mode-button").click()
    await expect(strategyPanel).toContainText("Trade advice")
    await expect(strategyPanel).toContainText("Trade edge")
  })
})

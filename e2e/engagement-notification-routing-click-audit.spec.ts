import { expect, test } from "@playwright/test"

async function gotoWithRetry(page: Parameters<typeof test>[0]["page"], url: string): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" })
      return
    } catch (error) {
      const message = String((error as Error)?.message ?? error)
      const canRetry =
        attempt < 2 &&
        (message.includes("net::ERR_ABORTED") || message.includes("interrupted by another navigation"))
      if (!canRetry) throw error
      await page.waitForTimeout(200)
    }
  }
}

test.describe("@retention engagement notification routing click audit", () => {
  test("notification links and deep links resolve safely for engagement types", async ({ page }) => {
    await gotoWithRetry(page, "/e2e/engagement-notification-routing")

    await expect(
      page.getByRole("heading", { name: "Engagement Notification Routing Harness" })
    ).toBeVisible()
    await expect(page.getByTestId("notification-drawer-panel")).toBeVisible()

    const dailyLink = page.getByRole("link", { name: /Daily digest ready/i })
    const leagueLink = page.getByRole("link", { name: /League lineup reminder/i })
    const aiLink = page.getByRole("link", { name: /AI insight unlocked/i })
    const weeklyLink = page.getByRole("link", { name: /Weekly recap summary/i })
    const blockedLink = page.getByRole("link", { name: /Unsafe link blocked/i })

    await expect(dailyLink).toHaveAttribute("href", "/trade-analyzer")
    await expect(leagueLink).toHaveAttribute("href", "/app/league/league-123")
    await expect(aiLink).toHaveAttribute("href", "/chimmy")
    await expect(weeklyLink).toHaveAttribute("href", "/tools-hub")
    await expect(blockedLink).toHaveAttribute("href", "/dashboard")

    await dailyLink.click()
    await expect(page).toHaveURL(/\/trade-analyzer/)

    await gotoWithRetry(page, "/e2e/engagement-notification-routing")
    await page.getByRole("link", { name: /AI insight unlocked/i }).click()
    await expect(page).toHaveURL(/\/chimmy/)

    await gotoWithRetry(page, "/e2e/engagement-notification-routing")
    await page.getByRole("link", { name: /Weekly recap summary/i }).click()
    await expect(page).toHaveURL(/\/tools-hub/)
  })
})

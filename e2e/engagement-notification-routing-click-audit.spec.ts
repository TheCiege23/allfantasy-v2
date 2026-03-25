import { expect, test } from "@playwright/test"

test.describe("@retention engagement notification routing click audit", () => {
  test("notification links and deep links resolve safely for engagement types", async ({ page }) => {
    await page.goto("/e2e/engagement-notification-routing", { waitUntil: "domcontentloaded" })

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

    await page.goto("/e2e/engagement-notification-routing", { waitUntil: "domcontentloaded" })
    await page.getByRole("link", { name: /AI insight unlocked/i }).click()
    await expect(page).toHaveURL(/\/chimmy/)

    await page.goto("/e2e/engagement-notification-routing", { waitUntil: "domcontentloaded" })
    await page.getByRole("link", { name: /Weekly recap summary/i }).click()
    await expect(page).toHaveURL(/\/tools-hub/)
  })
})

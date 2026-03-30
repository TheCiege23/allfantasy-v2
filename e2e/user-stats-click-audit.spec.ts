import { expect, test } from "@playwright/test"

test.describe("@user-stats click audit", () => {
  test("cross-league stats cards and empty state are fully wired", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/e2e/user-stats", { waitUntil: "domcontentloaded" })

    await expect(page.getByRole("heading", { name: /user stats harness/i })).toBeVisible()
    await expect(page.getByTestId("user-stats-card-wins")).toContainText("86")
    await expect(page.getByTestId("user-stats-card-losses")).toContainText("54")
    await expect(page.getByTestId("user-stats-card-championships")).toContainText("6")
    await expect(page.getByTestId("user-stats-card-playoffs")).toContainText("11")
    await expect(page.getByTestId("user-stats-card-draft-grades")).toContainText("A-")
    await expect(page.getByTestId("user-stats-card-trade-success")).toContainText("21/37 accepted")

    await page.getByTestId("user-stats-harness-toggle").click()
    await expect(page).toHaveURL(/\/e2e\/user-stats\?state=empty/)
    await expect(page.getByTestId("user-stats-harness-toggle")).toContainText("Show populated stats")
    await expect(page.getByText(/No league stats yet/i)).toBeVisible()

    await page.getByTestId("user-stats-harness-toggle").click()
    await expect(page).toHaveURL(/\/e2e\/user-stats$/)
    await expect(page.getByTestId("user-stats-card-wins")).toContainText("86")
  })
})

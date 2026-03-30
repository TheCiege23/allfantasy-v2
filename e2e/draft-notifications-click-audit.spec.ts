import { expect, test, type Page } from "@playwright/test"

test.describe.configure({ timeout: 120_000 })

async function gotoWithRetry(page: Page, url: string): Promise<void> {
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

test.describe("@draft-notifications draft notifications click audit", () => {
  test("opens draft destinations, updates read state, and hides unavailable channels", async ({ page }) => {
    await page.route("**/login?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><body>Login</body></html>",
      })
    })

    await gotoWithRetry(page, "/e2e/draft-notifications")

    await expect(page.getByRole("heading", { name: "Draft Notifications Harness" })).toBeVisible()
    await expect(page.getByTestId("harness-hydrated")).toHaveText("hydrated")
    const drawer = page.getByTestId("notification-drawer-panel")
    await expect(drawer).toBeVisible()

    const onClockLink = drawer.getByTestId("notification-link-draft-on-clock")
    const reminderLink = drawer.getByTestId("notification-link-draft-slow-reminder")

    await expect(onClockLink).toHaveAttribute("href", "/app/league/harness-league/draft")
    await expect(reminderLink).toHaveAttribute("href", "/app/league/harness-league/draft")

    await expect(page.getByTestId("harness-unread-count")).toHaveText("Unread: 2")
    await page.getByTestId("harness-mark-on-clock-read").click()
    await expect(page.getByTestId("harness-unread-count")).toHaveText("Unread: 1")

    await expect(page.getByRole("heading", { name: "Draft alerts channel settings preview" })).toBeVisible()

    await expect(
      page.getByRole("checkbox", { name: /Draft alerts \(on the clock, timer, trade offers\) In-app/i })
    ).toBeVisible()
    await expect(
      page.getByRole("checkbox", { name: /Draft alerts \(on the clock, timer, trade offers\) Email/i })
    ).toHaveCount(0)
    await expect(
      page.getByRole("checkbox", { name: /Draft alerts \(on the clock, timer, trade offers\) SMS/i })
    ).toHaveCount(0)
  })
})

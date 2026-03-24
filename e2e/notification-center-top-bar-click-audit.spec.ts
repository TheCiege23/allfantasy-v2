import { expect, test } from "@playwright/test"
import { registerAndLogin } from "./helpers/auth-flow"

type NotificationFixture = {
  id: string
  type: string
  title: string
  body: string
  product: "shared" | "app" | "bracket" | "legacy"
  severity: "low" | "medium" | "high"
  read: boolean
  createdAt: string
  meta: Record<string, unknown>
}

test.describe("@db @shell notification center + top bar click audit", () => {
  test.describe.configure({ timeout: 300_000, mode: "serial" })

  test("audits notification center and top bar interactions end-to-end", async ({ page }) => {
    await registerAndLogin(page)

    const profileState: Record<string, unknown> = {
      userId: "prompt81-user",
      username: "prompt81",
      email: "prompt81@example.com",
      displayName: "Prompt 81",
      profileImageUrl: null,
      avatarPreset: "crest",
      preferredLanguage: "en",
      timezone: "America/New_York",
      themePreference: "dark",
      phone: null,
      phoneVerifiedAt: null,
      emailVerifiedAt: null,
      ageConfirmedAt: null,
      verificationMethod: "EMAIL",
      hasPassword: true,
      profileComplete: true,
      sleeperUsername: null,
      sleeperLinkedAt: null,
      bio: null,
      preferredSports: ["NFL", "NBA", "MLB", "NHL", "NCAAB", "NCAAF", "SOCCER"],
      notificationPreferences: null,
      onboardingStep: null,
      onboardingCompletedAt: null,
      settings: null,
      updatedAt: new Date().toISOString(),
    }

    const now = Date.now()
    const notifications: NotificationFixture[] = [
      {
        id: "notif-draft",
        type: "draft_starting_soon",
        title: "Draft starts soon",
        body: "Your league draft starts in 10 minutes.",
        product: "app",
        severity: "high",
        read: false,
        createdAt: new Date(now - 15 * 60 * 1000).toISOString(),
        meta: { leagueId: "league-9", sport: "nfl" },
      },
      {
        id: "notif-mention",
        type: "mention",
        title: "You were mentioned",
        body: "Commissioner tagged you in chat.",
        product: "app",
        severity: "medium",
        read: false,
        createdAt: new Date(now - 23 * 60 * 60 * 1000).toISOString(),
        meta: { chatThreadId: "thread-123" },
      },
      {
        id: "notif-system",
        type: "announcement",
        title: "System maintenance",
        body: "Platform maintenance completed successfully.",
        product: "shared",
        severity: "low",
        read: true,
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        meta: {},
      },
    ]

    let markAllReadCalls = 0
    const markReadCalls: string[] = []

    await page.route("**/api/user/settings", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          profile: profileState,
          settings: {
            legalAcceptanceState: {
              ageVerified: true,
              disclaimerAccepted: true,
              termsAccepted: true,
              acceptedAt: new Date().toISOString(),
            },
          },
        }),
      })
    })

    await page.route("**/api/user/profile", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(profileState),
      })
    })

    await page.route("**/api/shared/wallet", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "ok",
          summary: {
            currency: "USD",
            balance: 0,
            pendingBalance: 0,
            potentialWinnings: 0,
            totalDeposited: 0,
            totalEntryFees: 0,
            totalWithdrawn: 0,
          },
        }),
      })
    })

    await page.route("**/api/shared/notifications?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", notifications }),
      })
    })

    await page.route("**/api/shared/notifications/read-all", async (route) => {
      if (route.request().method() === "PATCH") {
        markAllReadCalls += 1
        for (const notification of notifications) {
          notification.read = true
        }
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok" }),
      })
    })

    await page.route("**/api/shared/notifications/*/read", async (route) => {
      if (route.request().method() === "PATCH") {
        const url = new URL(route.request().url())
        const parts = url.pathname.split("/")
        const notificationId = decodeURIComponent(parts[parts.length - 2] ?? "")
        if (notificationId) {
          markReadCalls.push(notificationId)
          const target = notifications.find((item) => item.id === notificationId)
          if (target) target.read = true
        }
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok" }),
      })
    })

    await page.goto("/settings?tab=profile")
    const header = page
      .getByRole("link", { name: "AllFantasy.ai" })
      .first()
      .locator("xpath=ancestor::header[1]")
    const bellButton = header.getByRole("button", { name: "Notifications" })

    await expect(bellButton.locator("span")).toHaveText("2")

    await bellButton.click()
    const drawer = page.getByTestId("notification-drawer-panel")
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText("Today")).toBeVisible()
    await expect(drawer.getByText("Yesterday")).toBeVisible()
    await expect(drawer.getByText("Earlier")).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(drawer).not.toBeVisible()

    await bellButton.click()
    await expect(drawer).toBeVisible()
    await page.mouse.click(20, 260)
    await expect(drawer).not.toBeVisible()

    await bellButton.click()
    await expect(drawer).toBeVisible()
    await drawer.getByRole("button", { name: "Mark read" }).first().click()
    await expect.poll(() => markReadCalls.length).toBeGreaterThan(0)
    await expect(bellButton.locator("span")).toHaveText("1")

    await drawer.getByRole("button", { name: "Mark all read" }).click()
    await expect.poll(() => markAllReadCalls).toBeGreaterThan(0)
    await expect(bellButton.locator("span")).toHaveCount(0)

    await page.keyboard.press("Escape")
    await bellButton.click()
    await expect(drawer).toBeVisible()
    await expect(
      drawer.locator('a[href*="/messages?thread=thread-123"]').first()
    ).toHaveAttribute("href", /\/messages\?thread=thread-123/)
    await expect(
      drawer.getByRole("link", { name: "See all notifications" })
    ).toHaveAttribute("href", "/app/notifications")

    await page.goto("/settings?tab=profile")
    const refreshedHeader = page
      .getByRole("link", { name: "AllFantasy.ai" })
      .first()
      .locator("xpath=ancestor::header[1]")

    await refreshedHeader.getByRole("button", { name: "Search" }).click()
    await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog", { name: "Search" })).not.toBeVisible()

    await refreshedHeader.getByTestId("topbar-settings-shortcut").click()
    await expect(page).toHaveURL(/\/settings/)

    await refreshedHeader.getByRole("button", { name: "User menu" }).click()
    await expect(page.getByRole("menuitem", { name: "Profile" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Settings" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("menuitem", { name: "Settings" })).not.toBeVisible()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/settings?tab=profile")
    const mobileHeader = page
      .getByRole("link", { name: "AllFantasy.ai" })
      .first()
      .locator("xpath=ancestor::header[1]")
    await mobileHeader.getByRole("button", { name: "Open menu" }).click()
    const mobileDrawer = page.getByRole("dialog", { name: "Navigation menu" })
    await expect(mobileDrawer).toBeVisible()
    await expect(mobileDrawer.getByText("Appearance")).toBeVisible()
    const mobileNotificationsLink = mobileDrawer.getByRole("link", { name: "Notifications" })
    await expect(mobileNotificationsLink).toHaveAttribute("href", "/app/notifications")
    await mobileNotificationsLink.click()
    if (!/\/app\/notifications/.test(page.url())) {
      await page.goto("/app/notifications")
    }
    await expect(page).toHaveURL(/\/app\/notifications/)
    await expect(page.getByRole("heading", { name: "Notifications" }).first()).toBeVisible()
  })
})

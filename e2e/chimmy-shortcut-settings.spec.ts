import { expect, test } from "@playwright/test"
import { registerAndLoginTo } from "./helpers/auth-flow"

test.describe("@db chimmy shortcut settings", () => {
  test.describe.configure({ timeout: 240_000, mode: "serial" })

  test("disabling and re-enabling Chimmy shortcuts gates global '/' launcher behavior", async ({ page }) => {
    await registerAndLoginTo(page, null)

    const profileState: Record<string, unknown> = {
      userId: "chimmy-shortcut-user",
      username: "chimmyshortcut",
      email: "chimmy.shortcut@example.com",
      displayName: "Chimmy Shortcut",
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
      preferredSports: ["NFL"],
      notificationPreferences: {
        globalEnabled: true,
        categories: {
          lineup_reminders: { enabled: true, inApp: true, email: true, sms: false },
        },
      },
      onboardingStep: null,
      onboardingCompletedAt: null,
      settings: null,
      updatedAt: new Date().toISOString(),
    }

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
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(profileState),
        })
        return
      }

      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        })
        return
      }

      await route.fallback()
    })

    await page.route("**/api/ai/alerts/preferences", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          prefs: {
            frequency: "normal",
            sensitivity: "normal",
            mutedClasses: [],
            mutedTypes: [],
            channelPreferences: {
              disablePush: false,
              disableEmail: false,
              disableSms: false,
            },
            commissionerPrefs: {
              enabled: true,
              receiveSuspiciousTradeAlerts: true,
              receiveOrphanTeamAlerts: true,
              receiveIntegrityAlerts: true,
            },
          },
        }),
      })
    })

    await page.route("**/api/user/notifications?unread=true&limit=50", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ notifications: [], unreadCount: 0, unreadTotal: 0 }),
      })
    })

    await page.goto("/settings?tab=notifications", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("chimmy-shortcuts-toggle")).toBeVisible({ timeout: 20_000 })

    // Ensure deterministic baseline for this test run.
    await page.evaluate(() => {
      window.localStorage.removeItem("af_chimmy_shortcuts_disabled")
      window.localStorage.removeItem("af_chimmy_shortcut_hint_seen")
    })

    const shortcutToggle = page.getByTestId("chimmy-shortcuts-toggle")

    // 1) Disable shortcuts.
    await shortcutToggle.uncheck()

    // 2) '/' should not open Chimmy when disabled.
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("button", { name: /Open Chimmy/i })).toBeVisible({ timeout: 20_000 })
    const beforeDisabledShortcut = page.url()
    await page.keyboard.press("/")
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(beforeDisabledShortcut)

    // 3) Re-enable shortcuts and verify '/' opens Chimmy route.
    await page.goto("/settings?tab=notifications", { waitUntil: "domcontentloaded" })
    await shortcutToggle.check()

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" })
    await page.keyboard.press("/")
    await page.waitForURL("**/ai-chat**", { timeout: 15_000 })
  })
})

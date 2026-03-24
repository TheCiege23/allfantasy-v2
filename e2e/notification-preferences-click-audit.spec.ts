import { expect, test } from "@playwright/test"
import { registerAndLogin } from "./helpers/auth-flow"

test.describe("@db @notifications notification preferences click audit", () => {
  test.describe.configure({ timeout: 180_000, mode: "serial" })

  test("audits notification toggles, persistence, and mobile navigation", async ({ page }) => {
    await registerAndLogin(page)

    let savedPrefs: Record<string, unknown> = {
      globalEnabled: true,
      categories: {
        lineup_reminders: { enabled: true, inApp: true, email: true, sms: false },
        matchup_results: { enabled: true, inApp: true, email: true, sms: false },
        waiver_processing: { enabled: true, inApp: true, email: true, sms: false },
        trade_proposals: { enabled: true, inApp: true, email: true, sms: false },
        trade_accept_reject: { enabled: true, inApp: true, email: true, sms: false },
        chat_mentions: { enabled: true, inApp: true, email: true, sms: false },
        bracket_updates: { enabled: true, inApp: true, email: true, sms: false },
        ai_alerts: { enabled: true, inApp: true, email: true, sms: false },
        league_drama: { enabled: true, inApp: true, email: true, sms: false },
        commissioner_alerts: { enabled: true, inApp: true, email: true, sms: false },
        system_account: { enabled: true, inApp: true, email: true, sms: false },
        injury_alerts: { enabled: true, inApp: true, email: true, sms: false },
        performance_alerts: { enabled: true, inApp: true, email: true, sms: false },
        lineup_alerts: { enabled: true, inApp: true, email: true, sms: false },
        draft_alerts: { enabled: true, inApp: true, email: true, sms: false },
      },
    }

    const profileState: Record<string, unknown> = {
      userId: "notif-audit-user",
      username: "notifaudit",
      email: "notif.audit@example.com",
      displayName: "Notif Audit",
      profileImageUrl: null,
      avatarPreset: "crest",
      preferredLanguage: "en",
      timezone: "America/New_York",
      themePreference: "dark",
      phone: "+15555550199",
      phoneVerifiedAt: new Date().toISOString(),
      emailVerifiedAt: null,
      ageConfirmedAt: null,
      verificationMethod: "EMAIL",
      hasPassword: true,
      profileComplete: true,
      sleeperUsername: null,
      sleeperLinkedAt: null,
      bio: null,
      preferredSports: ["NFL"],
      notificationPreferences: savedPrefs,
      onboardingStep: null,
      onboardingCompletedAt: null,
      settings: null,
      updatedAt: new Date().toISOString(),
    }

    let lastPatchedPrefs: {
      globalEnabled?: boolean
      categories?: Record<string, { enabled: boolean; inApp: boolean; email: boolean; sms: boolean }>
    } | null = null

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
      if (route.request().method() === "PATCH") {
        const payload = route.request().postDataJSON() as { notificationPreferences?: Record<string, unknown> }
        if (payload.notificationPreferences) {
          savedPrefs = payload.notificationPreferences
          profileState.notificationPreferences = savedPrefs
          lastPatchedPrefs = payload.notificationPreferences as {
            globalEnabled?: boolean
            categories?: Record<string, { enabled: boolean; inApp: boolean; email: boolean; sms: boolean }>
          }
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        })
        return
      }

      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(profileState),
        })
        return
      }

      await route.fallback()
    })

    await page.route("**/api/user/notifications/test", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          sent: { inApp: true, email: true, sms: false },
          blockedReasons: [],
        }),
      })
    })

    await page.route("**/api/alerts/preferences", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            injuryAlerts: true,
            performanceAlerts: true,
            lineupAlerts: true,
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.goto("/settings?tab=notifications")
    await expect(page.getByRole("heading", { name: "Notifications" }).first()).toBeVisible()

    // Global toggle
    const globalCard = page.locator("div.rounded-xl").filter({ hasText: "non-critical notifications are paused" }).first()
    const globalToggle = globalCard.locator('input[type="checkbox"]').first()
    await globalToggle.uncheck()

    // Category expand/collapse and toggle wiring
    const lineupHeader = page.getByRole("button", { name: /Lineup reminders/i }).first()
    if ((await lineupHeader.getAttribute("aria-expanded")) !== "true") {
      await lineupHeader.click()
    }
    await expect(lineupHeader).toHaveAttribute("aria-expanded", "true")
    await page.getByRole("checkbox", { name: "Lineup reminders enabled" }).uncheck()
    await page.getByRole("checkbox", { name: "Lineup reminders Email" }).uncheck()
    await page.getByRole("checkbox", { name: "Lineup reminders SMS" }).check()

    const matchupHeader = page.getByRole("button", { name: /Matchup results/i }).first()
    await matchupHeader.click()
    await expect(matchupHeader).toHaveAttribute("aria-expanded", "true")
    await expect(lineupHeader).toHaveAttribute("aria-expanded", "false")

    // Save flow
    await page.getByRole("button", { name: "Save preferences" }).click()
    await expect.poll(() => lastPatchedPrefs !== null).toBe(true)
    const patchedPrefs = lastPatchedPrefs as {
      globalEnabled?: boolean
      categories?: Record<string, { enabled: boolean; inApp: boolean; email: boolean; sms: boolean }>
    } | null
    if (!patchedPrefs?.categories) {
      throw new Error("Patched preferences were not captured")
    }
    expect(patchedPrefs.globalEnabled).toBe(false)
    const patchedLineup = patchedPrefs.categories.lineup_reminders
    expect(patchedLineup.enabled).toBe(false)
    expect(patchedLineup.email).toBe(false)
    expect(patchedLineup.sms).toBe(true)

    // Persist after reload
    await page.reload()
    await expect(globalCard.locator('input[type="checkbox"]').first()).not.toBeChecked()
    const lineupHeaderAfterReload = page.getByRole("button", { name: /Lineup reminders/i }).first()
    if ((await lineupHeaderAfterReload.getAttribute("aria-expanded")) !== "true") {
      await lineupHeaderAfterReload.click()
    }
    await expect(page.getByRole("checkbox", { name: "Lineup reminders enabled" })).not.toBeChecked()
    await expect(page.getByRole("checkbox", { name: "Lineup reminders SMS" })).toBeChecked()

    // Reset flow
    await page.getByRole("button", { name: "Reset to defaults" }).click()
    await page.getByRole("button", { name: "Save preferences" }).click()
    await page.reload()
    await expect(globalCard.locator('input[type="checkbox"]').first()).toBeChecked()

    // Test notification button
    await page.getByRole("button", { name: "Send test notification" }).click()
    await expect(page.getByText("Test sent via inApp, email.")).toBeVisible()

    // Back/help links in notification area
    await page.getByRole("link", { name: "Sports alerts page" }).click()
    await expect(page).toHaveURL(/\/alerts\/settings/)
    await page.goto("/settings?tab=notifications")
    await page.getByRole("link", { name: "Back to profile" }).click()
    await expect(page).toHaveURL(/\/settings\?tab=profile/)

    // Mobile settings navigation
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/settings")
    await page.getByRole("button", { name: "Notifications" }).click()
    await expect(page.getByRole("heading", { name: "Notifications" }).first()).toBeVisible()
  })
})

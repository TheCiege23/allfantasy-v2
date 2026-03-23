import { expect, test } from "@playwright/test"
import { registerAndLogin } from "./helpers/auth-flow"

test.describe("@db @security security-contact settings click audit", () => {
  test.describe.configure({ timeout: 180_000, mode: "serial" })

  test("audits security/contact click paths on settings", async ({ page }) => {
    await registerAndLogin(page)

    const profileState: Record<string, unknown> = {
      userId: "security-audit-user",
      username: "securityaudit",
      email: "security.audit@example.com",
      displayName: "Security Audit",
      profileImageUrl: null,
      avatarPreset: "crest",
      preferredLanguage: "en",
      timezone: "America/New_York",
      themePreference: "dark",
      phone: "+15555550101",
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
      notificationPreferences: null,
      onboardingStep: null,
      onboardingCompletedAt: null,
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

    await page.route("**/api/user/contact/email", async (route) => {
      const body = route.request().postDataJSON() as {
        email?: string
      }
      profileState.email = String(body?.email ?? profileState.email)
      profileState.emailVerifiedAt = null
      profileState.updatedAt = new Date().toISOString()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, verificationEmailSent: true }),
      })
    })

    await page.route("**/api/auth/verify-email/send", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.route("**/api/verify/phone/start", async (route) => {
      const body = route.request().postDataJSON() as {
        phone?: string
      }
      profileState.phone = String(body?.phone ?? profileState.phone)
      profileState.phoneVerifiedAt = null
      profileState.updatedAt = new Date().toISOString()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.route("**/api/verify/phone/check", async (route) => {
      profileState.phoneVerifiedAt = new Date().toISOString()
      profileState.updatedAt = new Date().toISOString()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.route("**/api/user/password/change", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.goto("/settings?tab=security")
    await expect(page.getByRole("heading", { name: "Security" })).toBeVisible()
    await expect(page.getByText("Account security status")).toBeVisible()

    // Email actions: edit/save/verify
    await page.getByRole("button", { name: "Edit email" }).click()
    await page.locator('input[placeholder="you@example.com"]').first().fill("updated.security@example.com")
    await page.locator('input[autocomplete="current-password"]').first().fill("Password123!")
    await page.getByRole("button", { name: "Save email" }).click()
    await expect(page.getByText("Email updated. Check your inbox to verify the new address.")).toBeVisible()
    await expect(page.getByText("updated.security@example.com")).toBeVisible()
    await page.getByRole("button", { name: "Send verification" }).click()
    await expect(page.getByText("Check your email for the verification link.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Verify / change" })).toHaveAttribute("href", "/verify?method=email")

    // Email cancel path
    await page.getByRole("button", { name: "Edit email" }).click()
    await page.getByRole("button", { name: "Cancel" }).first().click()

    // Phone actions: edit/send/resend/verify/cancel
    await page.getByRole("button", { name: "Update phone" }).click()
    await page.locator('input[placeholder="+1 234 567 8900"]').first().fill("+1 555 555 0199")
    await page.getByRole("button", { name: "Send verification code" }).click()
    await expect(page.locator('input[placeholder="000000"]').first()).toBeVisible()
    await page.getByRole("button", { name: "Resend code" }).click()
    await page.locator('input[placeholder="000000"]').first().fill("123456")
    await page.getByRole("button", { name: "Verify" }).click()
    await expect(page.getByText("Verified · +15555550199")).toBeVisible()

    await page.getByRole("button", { name: "Update phone" }).click()
    await page.getByRole("button", { name: "Cancel" }).first().click()
    await expect(page.locator('input[placeholder="+1 234 567 8900"]').first()).not.toBeVisible()

    // Password actions: open/show/hide/save/cancel
    await page.getByRole("button", { name: "Change password" }).click()
    await page.locator('input[autocomplete="current-password"]').first().fill("Password123!")
    await page.locator('input[autocomplete="new-password"]').nth(0).fill("Password1234")
    await page.locator('input[autocomplete="new-password"]').nth(1).fill("Password1234")

    const showToggles = page.locator('button[aria-label="Show"]')
    await expect(showToggles).toHaveCount(3)
    await showToggles.nth(0).click()
    await expect(page.locator('button[aria-label="Hide"]').first()).toBeVisible()

    await page.getByRole("button", { name: "Save new password" }).click()
    await expect(page.getByText("Password updated successfully.")).toBeVisible()

    await page.waitForTimeout(2100)
    await page.getByRole("button", { name: "Change password" }).click()
    await page.getByRole("button", { name: "Cancel" }).first().click()
    await expect(page.locator('input[autocomplete="new-password"]').first()).not.toBeVisible()

    // Mobile sanity checks for the same click paths
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/settings?tab=security")
    await expect(page.getByRole("heading", { name: "Security" })).toBeVisible()
    await page.getByRole("button", { name: "Edit email" }).click()
    await page.getByRole("button", { name: "Cancel" }).first().click()
    await page.getByRole("button", { name: "Update phone" }).click()
    await page.getByRole("button", { name: "Cancel" }).first().click()
    await page.getByRole("button", { name: "Change password" }).click()
    await page.getByRole("button", { name: "Cancel" }).first().click()

    // Back buttons/routes in verification and recovery flows
    await page.goto("/verify?method=email&returnTo=%2Fsettings")
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible()
    await page.goto("/forgot-password")
    await expect(page.getByRole("link", { name: "Back to Sign In" })).toBeVisible()
  })
})

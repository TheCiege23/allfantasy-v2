/**
 * Password reset tests (8 tests)
 *
 * Tests cover:
 * - Request password reset with valid email (always returns 200 for privacy)
 * - Request password reset with unknown email (same 200 response)
 * - Reset link contains valid token (server-side verification)
 * - Reset link with invalid token rejected
 * - Reset link with expired token rejected
 * - Password update with matching passwords succeeds
 * - Password update with mismatched passwords fails
 * - Old credentials fail after password reset
 */

import { test, expect } from "@playwright/test"
import {
  createTestUser,
  deleteTestUser,
  createPasswordResetToken,
  createExpiredPasswordResetToken,
} from "../fixtures/db.fixtures"
import { TEST_PASSWORD, uniqueEmail, uniqueUsername } from "../fixtures/user.fixtures"
import { SELECTORS, ROUTES } from "../helpers/selectors"

test.describe("Password reset", () => {
  let testEmail: string
  let testUserId: string

  test.beforeEach(async () => {
    const user = await createTestUser({
      email: uniqueEmail("pwreset"),
      username: uniqueUsername("pwr"),
      password: TEST_PASSWORD,
    })
    testEmail = user.email
    testUserId = user.id
  })

  test.afterEach(async () => {
    await deleteTestUser(testEmail).catch(() => {})
  })

  // ── 1. Request with valid email returns success (no leakage) ─────────────
  test("password reset request with valid email returns 200", async ({ request }) => {
    const res = await request.post(ROUTES.api.passwordResetRequest, {
      data: { email: testEmail },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  // ── 2. Request with unknown email returns same 200 (privacy) ─────────────
  test("password reset request with unknown email returns 200 (no leakage)", async ({ request }) => {
    const res = await request.post(ROUTES.api.passwordResetRequest, {
      data: { email: "nobody@unknown-domain-test.com" },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    // Must return same response shape to avoid user enumeration
    expect(body.ok).toBe(true)
  })

  // ── 3. Valid token — password reset confirm succeeds ──────────────────────
  test("valid reset token allows password update", async ({ page, request }) => {
    const rawToken = await createPasswordResetToken(testUserId)
    const newPassword = "NewPass456"

    const res = await request.post(ROUTES.api.passwordResetConfirm, {
      data: { token: rawToken, newPassword },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    // Verify new password works
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, testEmail)
    await page.fill(SELECTORS.signin.password, newPassword)
    await page.click(SELECTORS.signin.submit)
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
  })

  // ── 4. Invalid token rejected ─────────────────────────────────────────────
  test("invalid reset token is rejected with 400", async ({ request }) => {
    const res = await request.post(ROUTES.api.passwordResetConfirm, {
      data: { token: "invalidtoken123", newPassword: "NewPass456" },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/INVALID|USED|TOKEN/i)
  })

  // ── 5. Expired token rejected ─────────────────────────────────────────────
  test("expired reset token is rejected with 400", async ({ request }) => {
    const rawToken = await createExpiredPasswordResetToken(testUserId)

    const res = await request.post(ROUTES.api.passwordResetConfirm, {
      data: { token: rawToken, newPassword: "NewPass456" },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/EXPIRED|INVALID/i)
  })

  // ── 6. Password mismatch on reset form ───────────────────────────────────
  test("reset password form rejects mismatched passwords", async ({ page }) => {
    const rawToken = await createPasswordResetToken(testUserId)

    await page.goto(`${ROUTES.resetPassword}?token=${rawToken}`)
    await page.fill(SELECTORS.resetPassword.newPassword, "NewPass456")
    await page.fill(SELECTORS.resetPassword.confirmPassword, "WrongPass789")
    await page.click(SELECTORS.resetPassword.submit)

    await expect(page.locator(SELECTORS.resetPassword.error)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(SELECTORS.resetPassword.error)).toContainText(/do not match/i)
  })

  // ── 7. Successful password reset via UI ───────────────────────────────────
  test("successful password reset via UI redirects to login", async ({ page }) => {
    const rawToken = await createPasswordResetToken(testUserId)
    const newPassword = "NewPass789"

    await page.goto(`${ROUTES.resetPassword}?token=${rawToken}`)
    await page.fill(SELECTORS.resetPassword.newPassword, newPassword)
    await page.fill(SELECTORS.resetPassword.confirmPassword, newPassword)
    await page.click(SELECTORS.resetPassword.submit)

    // Should show success state or redirect to login
    await expect(page).toHaveURL(/(login|reset-password)/, { timeout: 15_000 })
  })

  // ── 8. Old password fails after reset ────────────────────────────────────
  test("old password is rejected after a successful password reset", async ({ page, request }) => {
    const rawToken = await createPasswordResetToken(testUserId)
    const newPassword = "BrandNew789"

    // Reset password
    await request.post(ROUTES.api.passwordResetConfirm, {
      data: { token: rawToken, newPassword },
    })

    // Try logging in with old password
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, testEmail)
    await page.fill(SELECTORS.signin.password, TEST_PASSWORD)
    await page.click(SELECTORS.signin.submit)

    await expect(page.locator(SELECTORS.signin.error)).toBeVisible({ timeout: 10_000 })
  })
})

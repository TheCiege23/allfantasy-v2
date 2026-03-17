import { test, expect } from "@playwright/test"
import { createUserFixture, deleteTestUsers } from "../fixtures/user.fixtures"
import { createPasswordResetToken, createExpiredPasswordResetToken } from "../helpers/db.helpers"
import { FORGOT_PASSWORD, RESET_PASSWORD } from "../helpers/selectors"
import type { UserFixture } from "../fixtures/user.fixtures"

test.describe("Password Reset", () => {
  let testUser: UserFixture

  test.beforeAll(async () => {
    testUser = await createUserFixture({
      username: "pwtest_pwreset",
      email: "test+pwreset@playwright.test",
      password: "OldPass123",
    })
  })

  test.afterAll(async () => {
    await deleteTestUsers()
  })

  test("forgot-password page renders email field and submit button", async ({ page }) => {
    await page.goto("/forgot-password")
    await expect(page.locator(FORGOT_PASSWORD.email)).toBeVisible()
    await expect(page.locator(FORGOT_PASSWORD.submit)).toBeVisible()
  })

  test("request password reset with valid email shows confirmation", async ({ page }) => {
    await page.goto("/forgot-password")
    await page.fill(FORGOT_PASSWORD.email, testUser.email)
    await page.click(FORGOT_PASSWORD.submit)

    // App always shows generic success to prevent enumeration
    await expect(page.locator("text=Check your email")).toBeVisible({ timeout: 8000 })
  })

  test("request password reset with non-existent email also shows confirmation (no enumeration)", async ({ page }) => {
    await page.goto("/forgot-password")
    await page.fill(FORGOT_PASSWORD.email, "nobody@playwright.test")
    await page.click(FORGOT_PASSWORD.submit)

    // Should show the same generic success message
    await expect(page.locator("text=Check your email")).toBeVisible({ timeout: 8000 })
  })

  test("reset link with valid token shows reset form", async ({ page }) => {
    const rawToken = await createPasswordResetToken(testUser.id)
    await page.goto(`/reset-password?token=${encodeURIComponent(rawToken)}`)

    await expect(page.locator(RESET_PASSWORD.newPassword)).toBeVisible({ timeout: 5000 })
    await expect(page.locator(RESET_PASSWORD.confirmPassword)).toBeVisible()
    await expect(page.locator(RESET_PASSWORD.submit)).toBeVisible()
  })

  test("reset link with invalid token rejected", async ({ page }) => {
    const res = await page.evaluate(async () => {
      const r = await fetch("/api/auth/password/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "invalid-token-xyz-123", newPassword: "NewPass123" }),
      })
      return { status: r.status, data: await r.json() }
    })

    expect(res.status).toBe(400)
    expect(res.data.error).toBe("INVALID_OR_USED_TOKEN")
  })

  test("reset link with expired token rejected with EXPIRED_TOKEN error", async ({ page }) => {
    const expiredToken = await createExpiredPasswordResetToken(testUser.id)

    const res = await page.evaluate(async (token) => {
      const r = await fetch("/api/auth/password/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: "NewPass123" }),
      })
      return { status: r.status, data: await r.json() }
    }, expiredToken)

    expect(res.status).toBe(400)
    expect(res.data.error).toBe("EXPIRED_TOKEN")
  })

  test("password update with matching passwords succeeds", async ({ page }) => {
    const rawToken = await createPasswordResetToken(testUser.id)

    const res = await page.evaluate(async (token) => {
      const r = await fetch("/api/auth/password/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: "NewPass456" }),
      })
      return { status: r.status, data: await r.json() }
    }, rawToken)

    expect(res.status).toBe(200)
    expect(res.data.ok).toBe(true)
  })

  test("password update with mismatched passwords fails client-side", async ({ page }) => {
    const rawToken = await createPasswordResetToken(testUser.id)
    await page.goto(`/reset-password?token=${encodeURIComponent(rawToken)}`)

    await page.fill(RESET_PASSWORD.newPassword, "NewPass789")
    await page.fill(RESET_PASSWORD.confirmPassword, "DifferentPass789")
    await page.click(RESET_PASSWORD.submit)

    // Client-side validation should show error
    await expect(page.locator(RESET_PASSWORD.error)).toBeVisible({ timeout: 5000 })
    const errorText = await page.locator(RESET_PASSWORD.error).textContent()
    expect(errorText?.toLowerCase()).toContain("match")
  })

  test("token is one-time use: second use is rejected", async ({ page }) => {
    const rawToken = await createPasswordResetToken(testUser.id)

    // First use
    const res1 = await page.evaluate(async (token) => {
      const r = await fetch("/api/auth/password/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: "FirstUse111" }),
      })
      return r.status
    }, rawToken)
    expect(res1).toBe(200)

    // Second use of the same token
    const res2 = await page.evaluate(async (token) => {
      const r = await fetch("/api/auth/password/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: "SecondUse222" }),
      })
      return r.status
    }, rawToken)
    expect(res2).toBe(400)
  })
})

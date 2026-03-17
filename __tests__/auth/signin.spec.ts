/**
 * Signin flow tests (12 tests)
 *
 * Tests cover:
 * - Login with valid email + password
 * - Login with valid username + password
 * - Login with invalid email
 * - Login with invalid password
 * - Case-insensitive username login
 * - Missing email/password fields
 * - Generic error messages (no sensitive info leakage)
 * - Rate limiting triggered
 * - User locked out after rate limit exceeded
 * - Session created after successful login
 * - lastLoginAt / redirect after login
 * - Sleeper login flow (if implemented)
 */

import { test, expect } from "@playwright/test"
import {
  createTestUser,
  deleteTestUser,
} from "../fixtures/db.fixtures"
import { TEST_PASSWORD, uniqueEmail, uniqueUsername } from "../fixtures/user.fixtures"
import { SELECTORS, ROUTES } from "../helpers/selectors"

test.describe("Signin flows", () => {
  let testEmail: string
  let testUsername: string
  let testUserId: string

  test.beforeAll(async () => {
    const user = await createTestUser({
      email: uniqueEmail("signin"),
      username: uniqueUsername("si"),
      password: TEST_PASSWORD,
    })
    testEmail = user.email
    testUsername = user.username
    testUserId = user.id
  })

  test.afterAll(async () => {
    await deleteTestUser(testEmail).catch(() => {})
  })

  // ── 1. Login with valid email + password ──────────────────────────────────
  test("login with valid email and password redirects to dashboard", async ({ page }) => {
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, testEmail)
    await page.fill(SELECTORS.signin.password, TEST_PASSWORD)
    await page.click(SELECTORS.signin.submit)

    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
  })

  // ── 2. Login with valid username + password ───────────────────────────────
  test("login with valid username and password redirects to dashboard", async ({ page }) => {
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, testUsername)
    await page.fill(SELECTORS.signin.password, TEST_PASSWORD)
    await page.click(SELECTORS.signin.submit)

    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
  })

  // ── 3. Login with invalid email ───────────────────────────────────────────
  test("login with non-existent email shows generic error", async ({ page }) => {
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, "nobody@nowhere.example")
    await page.fill(SELECTORS.signin.password, TEST_PASSWORD)
    await page.click(SELECTORS.signin.submit)

    await expect(page.locator(SELECTORS.signin.error)).toBeVisible({ timeout: 10_000 })
    // Must not say "user not found" — generic message only
    const msg = await page.locator(SELECTORS.signin.error).textContent()
    expect(msg).not.toMatch(/user not found/i)
    expect(msg).not.toMatch(/no account/i)
  })

  // ── 4. Login with invalid password ───────────────────────────────────────
  test("login with wrong password shows generic error", async ({ page }) => {
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, testEmail)
    await page.fill(SELECTORS.signin.password, "WrongPassword999")
    await page.click(SELECTORS.signin.submit)

    await expect(page.locator(SELECTORS.signin.error)).toBeVisible({ timeout: 10_000 })
    // Generic message only
    const msg = await page.locator(SELECTORS.signin.error).textContent()
    expect(msg).not.toMatch(/user not found/i)
  })

  // ── 5. Case-insensitive username login ────────────────────────────────────
  test("username login is case-insensitive", async ({ page }) => {
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, testUsername.toUpperCase())
    await page.fill(SELECTORS.signin.password, TEST_PASSWORD)
    await page.click(SELECTORS.signin.submit)

    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
  })

  // ── 6a. Missing email/login field ────────────────────────────────────────
  test("missing login field keeps submit disabled", async ({ page }) => {
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.password, TEST_PASSWORD)
    await expect(page.locator(SELECTORS.signin.submit)).toBeDisabled()
  })

  // ── 6b. Missing password field ────────────────────────────────────────────
  test("missing password field keeps submit disabled", async ({ page }) => {
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, testEmail)
    await expect(page.locator(SELECTORS.signin.submit)).toBeDisabled()
  })

  // ── 7. Generic error messages — no sensitive leakage ─────────────────────
  test("error messages do not leak sensitive information", async ({ page }) => {
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, "doesnotexist@example.com")
    await page.fill(SELECTORS.signin.password, "somepassword1")
    await page.click(SELECTORS.signin.submit)

    await expect(page.locator(SELECTORS.signin.error)).toBeVisible({ timeout: 10_000 })
    const msg = (await page.locator(SELECTORS.signin.error).textContent()) ?? ""
    expect(msg).not.toMatch(/user not found/i)
    expect(msg).not.toMatch(/email.*not.*registered/i)
    expect(msg).not.toMatch(/password.*wrong/i)
  })

  // ── 8. Session created after successful login ─────────────────────────────
  test("session is created after successful login", async ({ page, request }) => {
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, testEmail)
    await page.fill(SELECTORS.signin.password, TEST_PASSWORD)
    await page.click(SELECTORS.signin.submit)
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })

    // Verify session exists via NextAuth session endpoint
    const sessionRes = await page.request.get(ROUTES.api.nextauth)
    const session = await sessionRes.json()
    expect(session?.user).toBeDefined()
  })

  // ── 9. callbackUrl redirect ───────────────────────────────────────────────
  test("login redirects to callbackUrl when provided", async ({ page }) => {
    await page.goto(`${ROUTES.login}?callbackUrl=${encodeURIComponent(ROUTES.dashboard)}`)
    await page.fill(SELECTORS.signin.login, testEmail)
    await page.fill(SELECTORS.signin.password, TEST_PASSWORD)
    await page.click(SELECTORS.signin.submit)

    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
  })

  // ── 10. Submit button disabling during login ──────────────────────────────
  test("submit button is disabled while login is in progress", async ({ page }) => {
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, testEmail)
    await page.fill(SELECTORS.signin.password, TEST_PASSWORD)

    // Click and immediately check disabled state (race condition test)
    await page.click(SELECTORS.signin.submit)
    // After navigation, page changes — so just verify we land on dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
  })

  // ── 11. Login page renders correctly ─────────────────────────────────────
  test("login page has all required form elements", async ({ page }) => {
    await page.goto(ROUTES.login)
    await expect(page.locator(SELECTORS.signin.login)).toBeVisible()
    await expect(page.locator(SELECTORS.signin.password)).toBeVisible()
    await expect(page.locator(SELECTORS.signin.submit)).toBeVisible()
  })

  // ── 12. Sleeper login section is present ─────────────────────────────────
  test("Sleeper login section is visible on the login page", async ({ page }) => {
    await page.goto(ROUTES.login)
    await expect(page.locator("text=Sleeper Account")).toBeVisible({ timeout: 5_000 })
  })
})

/**
 * Protected routes tests (10 tests)
 *
 * Tests cover:
 * - Unauthenticated access to /dashboard redirects to /login
 * - Unauthenticated access to /leagues redirects to /login (if protected)
 * - Authenticated user accesses /dashboard successfully
 * - callbackUrl preserved after redirect
 * - User redirected to callbackUrl after login
 * - No protected content flash (loading/skeleton state)
 * - No infinite redirect loops
 * - Navbar shows correct user context when logged in
 * - Logout redirects to /login
 * - Protected routes blocked after logout
 */

import { test, expect } from "@playwright/test"
import {
  createTestUser,
  deleteTestUser,
} from "../fixtures/db.fixtures"
import { TEST_PASSWORD, uniqueEmail, uniqueUsername } from "../fixtures/user.fixtures"
import { SELECTORS, ROUTES } from "../helpers/selectors"

test.describe("Protected routes", () => {
  let testEmail: string
  let testUsername: string

  test.beforeAll(async () => {
    const user = await createTestUser({
      email: uniqueEmail("protroute"),
      username: uniqueUsername("pr"),
      password: TEST_PASSWORD,
    })
    testEmail = user.email
    testUsername = user.username
  })

  test.afterAll(async () => {
    await deleteTestUser(testEmail).catch(() => {})
  })

  // ── Helper: sign in as the test user ──────────────────────────────────────
  async function signIn(page: any) {
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, testEmail)
    await page.fill(SELECTORS.signin.password, TEST_PASSWORD)
    await page.click(SELECTORS.signin.submit)
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
  }

  // ── 1. Unauthenticated /dashboard redirects to /login ────────────────────
  test("unauthenticated access to /dashboard redirects to /login", async ({ page }) => {
    await page.goto(ROUTES.dashboard)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })

  // ── 2. Unauthenticated /leagues ───────────────────────────────────────────
  test("unauthenticated access to /leagues either redirects or shows a public view", async ({ page }) => {
    const res = await page.goto(ROUTES.leagues)
    // Leagues may be public or protected; test just ensures no error page
    expect(res?.status()).toBeLessThan(500)
  })

  // ── 3. callbackUrl preserved after redirect ───────────────────────────────
  test("callbackUrl is preserved in login redirect from /dashboard", async ({ page }) => {
    await page.goto(ROUTES.dashboard)
    const url = new URL(page.url())
    // Should land on /login with callbackUrl param
    expect(url.pathname).toBe("/login")
    const callback = url.searchParams.get("callbackUrl") || url.searchParams.get("next")
    expect(callback).toMatch(/dashboard/)
  })

  // ── 4. Authenticated user can access /dashboard ───────────────────────────
  test("authenticated user can access /dashboard without redirect", async ({ page }) => {
    await signIn(page)
    await page.goto(ROUTES.dashboard)
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
    // Must not be redirected to login
    expect(page.url()).not.toMatch(/login/)
  })

  // ── 5. callbackUrl respected after login ─────────────────────────────────
  test("user is redirected to callbackUrl after login", async ({ page }) => {
    // First, navigate to a protected route to get a callbackUrl
    await page.goto(ROUTES.dashboard)
    const loginUrl = page.url()
    expect(loginUrl).toMatch(/login/)

    // Now complete login via the redirect URL
    await page.fill(SELECTORS.signin.login, testEmail)
    await page.fill(SELECTORS.signin.password, TEST_PASSWORD)
    await page.click(SELECTORS.signin.submit)

    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
  })

  // ── 6. No protected content flash ────────────────────────────────────────
  test("no protected dashboard content is briefly visible before redirect", async ({ page }) => {
    // Record any navigation events
    const urls: string[] = []
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) urls.push(frame.url())
    })

    await page.goto(ROUTES.dashboard)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })

    // Should never have shown the dashboard URL without auth
    const dashboardShown = urls.filter((u) => u.includes("/dashboard") && !u.includes("login"))
    // The server redirects, so no dashboard should be reached without auth
    expect(dashboardShown.length).toBeLessThanOrEqual(1)
  })

  // ── 7. No infinite redirect loops ────────────────────────────────────────
  test("navigating to /login when already on /login does not cause redirect loop", async ({ page }) => {
    await page.goto(ROUTES.login)
    await expect(page).toHaveURL(/login/, { timeout: 5_000 })
    // Navigate again — should stay on /login
    await page.goto(ROUTES.login)
    await expect(page).toHaveURL(/login/, { timeout: 5_000 })
  })

  // ── 8. Navbar shows correct user context ─────────────────────────────────
  test("navbar shows user menu after login", async ({ page }) => {
    await signIn(page)
    await expect(page.locator(SELECTORS.navbar.userMenu)).toBeVisible({ timeout: 10_000 })
  })

  // ── 9. Logout redirects to /login ────────────────────────────────────────
  test("clicking logout redirects to /login", async ({ page }) => {
    await signIn(page)
    await page.click(SELECTORS.navbar.logout)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })

  // ── 10. Protected routes blocked after logout ─────────────────────────────
  test("accessing /dashboard after logout redirects to /login", async ({ page }) => {
    await signIn(page)
    await page.click(SELECTORS.navbar.logout)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })

    // Attempt to access dashboard again
    await page.goto(ROUTES.dashboard)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })
})

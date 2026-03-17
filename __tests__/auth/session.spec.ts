/**
 * Session management tests (12 tests)
 *
 * Tests cover:
 * - Session persists across page reload
 * - Session persists after opening the same URL in a new context (same cookies)
 * - Session token visible in cookies (httpOnly flag)
 * - Logout clears session
 * - Protected routes blocked after logout
 * - Session data via /api/auth/session endpoint
 * - Profile data matches session data
 * - User can access their data immediately after login
 * - Session not logged in console
 * - Authenticated /api/user/profile returns correct data
 * - Unauthenticated /api/user/profile returns 401
 * - Session still valid after navigating away and back
 */

import { test, expect } from "@playwright/test"
import { createTestUser, deleteTestUser } from "../fixtures/db.fixtures"
import { TEST_PASSWORD, uniqueEmail, uniqueUsername } from "../fixtures/user.fixtures"
import { SELECTORS, ROUTES } from "../helpers/selectors"

test.describe("Session management", () => {
  let testEmail: string
  let testUsername: string

  test.beforeAll(async () => {
    const user = await createTestUser({
      email: uniqueEmail("session"),
      username: uniqueUsername("sess"),
      password: TEST_PASSWORD,
    })
    testEmail = user.email
    testUsername = user.username
  })

  test.afterAll(async () => {
    await deleteTestUser(testEmail).catch(() => {})
  })

  async function signIn(page: any) {
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, testEmail)
    await page.fill(SELECTORS.signin.password, TEST_PASSWORD)
    await page.click(SELECTORS.signin.submit)
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
  }

  // ── 1. Session persists across page reload ────────────────────────────────
  test("session persists after page reload", async ({ page }) => {
    await signIn(page)
    await page.reload()
    // Should still be on dashboard after reload
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
    await expect(page.locator(SELECTORS.navbar.userMenu)).toBeVisible()
  })

  // ── 2. Session persists after navigating away and back ────────────────────
  test("session persists after navigating away and returning to dashboard", async ({ page }) => {
    await signIn(page)
    await page.goto("/")
    await page.goto(ROUTES.dashboard)
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
    expect(page.url()).not.toMatch(/login/)
  })

  // ── 3. Session token is in cookies ───────────────────────────────────────
  test("session cookie is set after login", async ({ page }) => {
    await signIn(page)
    const cookies = await page.context().cookies()
    // NextAuth uses next-auth.session-token or __Secure-next-auth.session-token
    const sessionCookie = cookies.find(
      (c) => c.name.includes("next-auth.session-token") || c.name.includes("session-token")
    )
    expect(sessionCookie).toBeDefined()
    // httpOnly should be true for security
    expect(sessionCookie?.httpOnly).toBe(true)
  })

  // ── 4. Logout clears session ──────────────────────────────────────────────
  test("logout removes the session cookie", async ({ page }) => {
    await signIn(page)

    // Verify cookie exists before logout
    const cookiesBefore = await page.context().cookies()
    const sessionBefore = cookiesBefore.find((c) => c.name.includes("session-token"))
    expect(sessionBefore).toBeDefined()

    // Logout
    await page.click(SELECTORS.navbar.logout)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })

    // Verify session cookie is cleared
    const cookiesAfter = await page.context().cookies()
    const sessionAfter = cookiesAfter.find((c) => c.name.includes("session-token"))
    // Cookie should be absent or have empty/expired value
    const isCleared = !sessionAfter || sessionAfter.value === "" || sessionAfter.expires < Date.now() / 1000
    expect(isCleared).toBeTruthy()
  })

  // ── 5. Protected routes blocked after logout ──────────────────────────────
  test("dashboard is inaccessible after logout", async ({ page }) => {
    await signIn(page)
    await page.click(SELECTORS.navbar.logout)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })

    await page.goto(ROUTES.dashboard)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })

  // ── 6. Session data visible via /api/auth/session ─────────────────────────
  test("session data is returned from /api/auth/session when logged in", async ({ page }) => {
    await signIn(page)
    const res = await page.request.get(ROUTES.api.nextauth)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data?.user).toBeDefined()
    expect(data.user.email).toBe(testEmail)
  })

  // ── 7. Unauthenticated session endpoint returns no user ───────────────────
  test("session endpoint returns no user when not logged in", async ({ page }) => {
    await page.goto("/")
    const res = await page.request.get(ROUTES.api.nextauth)
    const data = await res.json()
    // Unauthenticated session has empty user or no user key
    expect(data?.user ?? null).toBeNull()
  })

  // ── 8. Authenticated /api/user/profile returns user data ─────────────────
  test("/api/user/profile returns profile data when authenticated", async ({ page }) => {
    await signIn(page)
    const res = await page.request.get(ROUTES.api.userProfile)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data?.user?.email).toBe(testEmail)
  })

  // ── 9. Unauthenticated /api/user/profile returns 401 ─────────────────────
  test("/api/user/profile returns 401 when not authenticated", async ({ request }) => {
    const res = await request.get(ROUTES.api.userProfile)
    expect(res.status()).toBe(401)
  })

  // ── 10. Profile data matches session data ─────────────────────────────────
  test("profile data matches session data", async ({ page }) => {
    await signIn(page)

    const sessionRes = await page.request.get(ROUTES.api.nextauth)
    const sessionData = await sessionRes.json()

    const profileRes = await page.request.get(ROUTES.api.userProfile)
    const profileData = await profileRes.json()

    expect(profileData?.user?.email).toBe(sessionData?.user?.email)
  })

  // ── 11. User can access data immediately after login ─────────────────────
  test("user data is accessible immediately after login", async ({ page }) => {
    await signIn(page)
    // Profile API should respond successfully right after login
    const res = await page.request.get(ROUTES.api.userProfile)
    expect(res.status()).toBe(200)
  })

  // ── 12. Session token not logged in browser console ───────────────────────
  test("session token value is not printed in browser console", async ({ page }) => {
    const consoleLogs: string[] = []
    page.on("console", (msg) => consoleLogs.push(msg.text()))

    await signIn(page)

    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find((c) => c.name.includes("session-token"))

    if (sessionCookie?.value) {
      const tokenLeaked = consoleLogs.some((log) => log.includes(sessionCookie.value))
      expect(tokenLeaked).toBe(false)
    }
  })
})

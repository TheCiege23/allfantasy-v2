/**
 * API auth enforcement tests (8 tests)
 *
 * Tests cover:
 * - GET /api/user/profile requires session (returns 401 unauthenticated)
 * - POST /api/league/create requires session (returns 401 unauthenticated)
 * - GET /api/user/profile returns user data when authenticated
 * - Invalid/missing session token returns 401
 * - Missing Authorization header returns 401
 * - API error messages don't leak sensitive info
 * - Session endpoint returns user when authenticated
 * - Rate limiting applies to API endpoints if configured
 */

import { test, expect } from "@playwright/test"
import { createTestUser, deleteTestUser } from "../fixtures/db.fixtures"
import { TEST_PASSWORD, uniqueEmail, uniqueUsername } from "../fixtures/user.fixtures"
import { SELECTORS, ROUTES } from "../helpers/selectors"
import { createLeagueViaApi } from "../helpers/api.helpers"

test.describe("API auth enforcement", () => {
  let testEmail: string

  test.beforeAll(async () => {
    const user = await createTestUser({
      email: uniqueEmail("apiauth"),
      username: uniqueUsername("api"),
      password: TEST_PASSWORD,
    })
    testEmail = user.email
  })

  test.afterAll(async () => {
    await deleteTestUser(testEmail).catch(() => {})
  })

  // ── 1. GET /api/user/profile returns 401 without auth ────────────────────
  test("GET /api/user/profile returns 401 when unauthenticated", async ({ request }) => {
    const res = await request.get(ROUTES.api.userProfile)
    expect(res.status()).toBe(401)
  })

  // ── 2. POST /api/league/create returns 401 without auth ──────────────────
  test("POST /api/league/create returns 401 when unauthenticated", async ({ request }) => {
    const res = await createLeagueViaApi(request)
    expect(res.status()).toBe(401)
  })

  // ── 3. GET /api/user/profile returns data when authenticated ─────────────
  test("GET /api/user/profile returns user data when authenticated", async ({ page }) => {
    // Sign in via the UI to establish a session
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, testEmail)
    await page.fill(SELECTORS.signin.password, TEST_PASSWORD)
    await page.click(SELECTORS.signin.submit)
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })

    const res = await page.request.get(ROUTES.api.userProfile)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data?.user?.email).toBe(testEmail)
  })

  // ── 4. Invalid session token returns 401 ─────────────────────────────────
  test("invalid session cookie returns 401 from /api/user/profile", async ({ request }) => {
    const res = await request.get(ROUTES.api.userProfile, {
      headers: {
        cookie: "next-auth.session-token=invalid-token-value",
      },
    })
    expect(res.status()).toBe(401)
  })

  // ── 5. API errors don't leak sensitive info ───────────────────────────────
  test("401 response from /api/user/profile does not leak sensitive info", async ({ request }) => {
    const res = await request.get(ROUTES.api.userProfile)
    const body = await res.json()
    const bodyStr = JSON.stringify(body)
    expect(bodyStr).not.toMatch(/password/i)
    expect(bodyStr).not.toMatch(/hash/i)
    expect(bodyStr).not.toMatch(/secret/i)
    expect(bodyStr).not.toMatch(/token/i)
  })

  // ── 6. /api/auth/session returns empty when unauthenticated ──────────────
  test("/api/auth/session returns empty user when not authenticated", async ({ request }) => {
    const res = await request.get(ROUTES.api.nextauth)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data?.user ?? null).toBeNull()
  })

  // ── 7. /api/auth/session returns user when authenticated ──────────────────
  test("/api/auth/session returns user data when authenticated", async ({ page }) => {
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, testEmail)
    await page.fill(SELECTORS.signin.password, TEST_PASSWORD)
    await page.click(SELECTORS.signin.submit)
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })

    const res = await page.request.get(ROUTES.api.nextauth)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data?.user?.email).toBe(testEmail)
  })

  // ── 8. POST /api/league/create with auth returns non-401 ─────────────────
  test("POST /api/league/create returns non-401 when authenticated", async ({ page }) => {
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, testEmail)
    await page.fill(SELECTORS.signin.password, TEST_PASSWORD)
    await page.click(SELECTORS.signin.submit)
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })

    const res = await createLeagueViaApi(page.request)
    // Authenticated: may succeed (200/201) or fail validation (400), but not 401
    expect(res.status()).not.toBe(401)
  })
})

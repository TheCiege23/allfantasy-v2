import { test, expect } from "@playwright/test"
import { createUserFixture, deleteTestUsers } from "../fixtures/user.fixtures"
import { signIn } from "../helpers/auth.helpers"
import type { UserFixture } from "../fixtures/user.fixtures"

test.describe("API Authentication", () => {
  let testUser: UserFixture

  test.beforeAll(async () => {
    testUser = await createUserFixture({
      username: "pwtest_apiauth",
      email: "test+apiauth@playwright.test",
      password: "TestPass123",
    })
  })

  test.afterAll(async () => {
    await deleteTestUsers()
  })

  test("GET /api/user/profile returns 401 when unauthenticated", async ({ page }) => {
    await page.context().clearCookies()
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/user/profile", { credentials: "include" })
      return res.status
    })
    expect(result).toBe(401)
  })

  test("POST /api/league/create returns 401 when unauthenticated", async ({ page }) => {
    await page.context().clearCookies()
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/league/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test League",
          platform: "manual",
          leagueSize: 10,
          scoring: "PPR",
          isDynasty: false,
          userId: "test",
        }),
        credentials: "include",
      })
      return res.status
    })
    expect(result).toBe(401)
  })

  test("GET /api/user/profile returns user data when authenticated", async ({ page }) => {
    await signIn(page, { login: testUser.email, password: testUser.password })
    await page.waitForURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 }).catch(() => {})

    const result = await page.evaluate(async () => {
      const res = await fetch("/api/user/profile", { credentials: "include" })
      return { status: res.status, data: await res.json() }
    })

    expect(result.status).toBe(200)
    expect(result.data).toHaveProperty("user")
    expect(result.data.user.email).toBeTruthy()
  })

  test("GET /api/auth/me returns 401 when unauthenticated", async ({ page }) => {
    await page.context().clearCookies()
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" })
      return res.status
    })
    expect(result).toBe(401)
  })

  test("API error messages do not leak user existence info", async ({ page }) => {
    await page.context().clearCookies()

    // Profile endpoint with no auth should return generic error
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/user/profile")
      return { status: res.status, data: await res.json() }
    })

    expect(result.status).toBe(401)
    const errorMsg = JSON.stringify(result.data).toLowerCase()
    // Should not reveal anything about user existence
    expect(errorMsg).not.toContain("not found")
    expect(errorMsg).not.toContain("no user")
    expect(errorMsg).not.toContain("user id")
  })

  test("GET /api/user/trade-profile returns 401 when unauthenticated", async ({ page }) => {
    await page.context().clearCookies()
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/user/trade-profile", { credentials: "include" })
      return res.status
    })
    expect(result).toBe(401)
  })

  test("password reset request API always returns 200 (no user enumeration)", async ({ page }) => {
    const result1 = await page.evaluate(async () => {
      const res = await fetch("/api/auth/password/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nonexistent@playwright.test" }),
      })
      return res.status
    })
    expect(result1).toBe(200)

    const result2 = await page.evaluate(async () => {
      const res = await fetch("/api/auth/password/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test+apiauth@playwright.test" }),
      })
      return res.status
    })
    // Both should return 200 regardless of whether user exists
    expect(result2).toBe(200)
  })

  test("rate limiting applies to register API endpoint", async ({ page }) => {
    const results: number[] = []
    for (let i = 0; i < 7; i++) {
      const status = await page.evaluate(async (i) => {
        const r = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: `pwtest_rlapply_${i}_${Date.now()}`,
            email: `test+rlapply_${i}_${Date.now()}@playwright.test`,
            password: "TestPass1",
            ageConfirmed: true,
            verificationMethod: "EMAIL",
          }),
        })
        return r.status
      }, i)
      results.push(status)
    }
    // At least one request should be rate limited (429)
    expect(results.some((s) => s === 429)).toBe(true)
  })
})

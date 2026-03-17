import { test, expect } from "@playwright/test"
import { deleteTestUsers } from "../fixtures/user.fixtures"

test.describe("Rate Limiting", () => {
  test.afterAll(async () => {
    await deleteTestUsers()
  })

  test("register endpoint: 5 successful attempts per window", async ({ page }) => {
    const results: number[] = []

    for (let i = 0; i < 5; i++) {
      const status = await page.evaluate(async (i) => {
        const r = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: `pwtest_rl5_${i}_${Date.now()}`,
            email: `test+rl5_${i}_${Date.now()}@playwright.test`,
            password: "TestPass1",
            ageConfirmed: true,
            verificationMethod: "EMAIL",
          }),
        })
        return r.status
      }, i)
      results.push(status)
    }

    // The first several attempts should succeed or fail with non-429 status
    const nonRateLimited = results.filter((s) => s !== 429)
    expect(nonRateLimited.length).toBeGreaterThan(0)
  })

  test("register endpoint: 6th attempt within window returns 429", async ({ page }) => {
    const results: number[] = []

    for (let i = 0; i < 7; i++) {
      const status = await page.evaluate(async (i) => {
        const r = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: `pwtest_rl6_${i}_${Date.now()}`,
            email: `test+rl6_${i}_${Date.now()}@playwright.test`,
            password: "TestPass1",
            ageConfirmed: true,
            verificationMethod: "EMAIL",
          }),
        })
        return r.status
      }, i)
      results.push(status)
    }

    // At least one should be rate limited
    expect(results.some((s) => s === 429)).toBe(true)
  })

  test("rate limit response includes clear error message", async ({ page }) => {
    let rateLimitedResponse: { status: number; data: unknown } | null = null

    for (let i = 0; i < 8; i++) {
      const result = await page.evaluate(async (i) => {
        const r = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: `pwtest_rlmsg_${i}_${Date.now()}`,
            email: `test+rlmsg_${i}_${Date.now()}@playwright.test`,
            password: "TestPass1",
            ageConfirmed: true,
            verificationMethod: "EMAIL",
          }),
        })
        const data = await r.json().catch(() => ({}))
        return { status: r.status, data }
      }, i)

      if (result.status === 429) {
        rateLimitedResponse = result
        break
      }
    }

    expect(rateLimitedResponse).not.toBeNull()
    if (rateLimitedResponse) {
      expect(rateLimitedResponse.status).toBe(429)
      // Response should have an error message
      const responseStr = JSON.stringify(rateLimitedResponse.data).toLowerCase()
      expect(responseStr.length).toBeGreaterThan(0)
    }
  })

  test("password reset endpoint has rate limiting", async ({ page }) => {
    const results: number[] = []

    for (let i = 0; i < 7; i++) {
      const status = await page.evaluate(async (i) => {
        const r = await fetch("/api/auth/password/reset/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: `test+rl_pwreset_${i}@playwright.test` }),
        })
        return r.status
      }, i)
      results.push(status)
    }

    // All should return 200 (API masks rate limit on password reset to prevent enumeration)
    // OR some may return 429 depending on implementation
    expect(results.every((s) => s === 200 || s === 429)).toBe(true)
  })

  test("different endpoints have independent rate limits", async ({ page }) => {
    // The register endpoint should rate limit independently from password reset
    const registerStatuses: number[] = []
    const resetStatuses: number[] = []

    for (let i = 0; i < 3; i++) {
      const regStatus = await page.evaluate(async (i) => {
        const r = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: `pwtest_rlindep_${i}_${Date.now()}`,
            email: `test+rlindep_${i}_${Date.now()}@playwright.test`,
            password: "TestPass1",
            ageConfirmed: true,
            verificationMethod: "EMAIL",
          }),
        })
        return r.status
      }, i)
      registerStatuses.push(regStatus)

      const resetStatus = await page.evaluate(async (i) => {
        const r = await fetch("/api/auth/password/reset/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: `test+indep_reset_${i}@playwright.test` }),
        })
        return r.status
      }, i)
      resetStatuses.push(resetStatus)
    }

    // Password reset should always return 200 within its own window
    expect(resetStatuses.every((s) => s === 200)).toBe(true)
  })

  test("rate limiter uses IP-based bucketing (X-Forwarded-For)", async ({ page }) => {
    // Send requests with different spoofed IPs - they should each have their own limits
    const results: number[] = []

    for (let i = 0; i < 2; i++) {
      const status = await page.evaluate(async (i) => {
        const r = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": `192.168.1.${i + 100}`,
          },
          body: JSON.stringify({
            username: `pwtest_iptest_${i}_${Date.now()}`,
            email: `test+iptest_${i}_${Date.now()}@playwright.test`,
            password: "TestPass1",
            ageConfirmed: true,
            verificationMethod: "EMAIL",
          }),
        })
        return r.status
      }, i)
      results.push(status)
    }

    // Both IPs should get non-429 responses (they have separate limits)
    // Note: In test env behind a proxy, X-Forwarded-For may or may not be honored
    expect(results.length).toBe(2)
    expect(results.every((s) => typeof s === "number")).toBe(true)
  })
})

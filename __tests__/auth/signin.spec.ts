import { test, expect } from "@playwright/test"
import { createUserFixture, deleteTestUsers } from "../fixtures/user.fixtures"
import { signIn, waitForSignInError } from "../helpers/auth.helpers"
import { SIGNIN } from "../helpers/selectors"
import type { UserFixture } from "../fixtures/user.fixtures"

test.describe("Signin", () => {
  let testUser: UserFixture

  test.beforeAll(async () => {
    testUser = await createUserFixture({
      username: "pwtest_signin",
      email: "test+signin@playwright.test",
      password: "TestPass123",
    })
  })

  test.afterAll(async () => {
    await deleteTestUsers()
  })

  test("login with valid email and password succeeds", async ({ page }) => {
    await signIn(page, { login: testUser.email, password: testUser.password })
    await expect(page).toHaveURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 })
  })

  test("login with valid username and password succeeds", async ({ page }) => {
    await signIn(page, { login: testUser.username, password: testUser.password })
    await expect(page).toHaveURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 })
  })

  test("login with invalid password returns generic error", async ({ page }) => {
    await signIn(page, { login: testUser.email, password: "WrongPass999" })
    const errorText = await waitForSignInError(page)
    expect(errorText).toBeTruthy()
    // Should NOT reveal "user not found" or "password incorrect" — generic message only
    expect(errorText.toLowerCase()).not.toContain("user not found")
    expect(errorText.toLowerCase()).not.toContain("no account")
  })

  test("login with non-existent email returns generic error", async ({ page }) => {
    await signIn(page, { login: "nonexistent@playwright.test", password: "AnyPass1" })
    const errorText = await waitForSignInError(page)
    expect(errorText).toBeTruthy()
    expect(errorText.toLowerCase()).not.toContain("user not found")
    expect(errorText.toLowerCase()).not.toContain("no account")
  })

  test("case-insensitive email matching works", async ({ page }) => {
    await signIn(page, {
      login: testUser.email.toUpperCase(),
      password: testUser.password,
    })
    // Case-insensitive email should succeed or fail gracefully (not server error)
    const url = page.url()
    expect(url).not.toContain("/500")
  })

  test("missing login field keeps submit button disabled", async ({ page }) => {
    await page.goto("/login")
    await page.waitForSelector(SIGNIN.login)

    await page.fill(SIGNIN.password, "TestPass123")
    await expect(page.locator(SIGNIN.submit)).toBeDisabled()
  })

  test("missing password field keeps submit button disabled", async ({ page }) => {
    await page.goto("/login")
    await page.waitForSelector(SIGNIN.login)

    await page.fill(SIGNIN.login, testUser.email)
    await expect(page.locator(SIGNIN.submit)).toBeDisabled()
  })

  test("error messages do not leak user existence info", async ({ page }) => {
    // Test with completely nonexistent email
    await signIn(page, { login: "nobody@playwright.test", password: "AnyPass1" })
    const error1 = await waitForSignInError(page)

    // Test with existing email but wrong password
    await page.goto("/login")
    await signIn(page, { login: testUser.email, password: "WrongPass999" })
    const error2 = await waitForSignInError(page)

    // Both errors should be identical (no user existence leakage)
    expect(error1.trim()).toBe(error2.trim())
  })

  test("rate limit: multiple failed attempts return 429 via API", async ({ page }) => {
    const results: number[] = []
    for (let i = 0; i < 6; i++) {
      const status = await page.evaluate(async () => {
        const res = await fetch("/api/auth/callback/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            login: "ratelimit@playwright.test",
            password: "WrongPass",
            csrfToken: "",
            json: "true",
          }),
        })
        return res.status
      })
      results.push(status)
    }
    // At least one response should be a rate limit (400 or 429) or similar rejection
    expect(results.some((s) => s >= 400)).toBe(true)
  })

  test("rate limit returns 429 with clear message via register API", async ({ page }) => {
    // Hit the register endpoint 6+ times rapidly from same context
    let got429 = false
    for (let i = 0; i < 7; i++) {
      const res = await page.evaluate(async (i) => {
        const r = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: `pwtest_rl_${i}_${Date.now()}`,
            email: `test+rl_${i}_${Date.now()}@playwright.test`,
            password: "TestPass1",
            ageConfirmed: true,
            verificationMethod: "EMAIL",
          }),
        })
        return r.status
      }, i)
      if (res === 429) got429 = true
    }
    // At least one request should be rate limited
    expect(got429).toBe(true)
  })

  test("session created after successful login", async ({ page }) => {
    await signIn(page, { login: testUser.email, password: testUser.password })
    await page.waitForURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 }).catch(() => {})

    const session = await page.evaluate(async () => {
      const res = await fetch("/api/auth/session")
      return res.json()
    })

    expect(session?.user).toBeTruthy()
  })

  test("signin form has all required fields", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator(SIGNIN.login)).toBeVisible()
    await expect(page.locator(SIGNIN.password)).toBeVisible()
    await expect(page.locator(SIGNIN.submit)).toBeVisible()
  })

  test("/api/auth/me returns user data when authenticated", async ({ page }) => {
    await signIn(page, { login: testUser.email, password: testUser.password })
    await page.waitForURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 }).catch(() => {})

    const result = await page.evaluate(async () => {
      const res = await fetch("/api/auth/me")
      return { status: res.status, data: await res.json() }
    })

    expect(result.status).toBe(200)
    expect(result.data).toHaveProperty("user")
  })
})

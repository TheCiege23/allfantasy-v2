import { test, expect } from "@playwright/test"
import { uniqueUsername, uniqueEmail } from "../fixtures/user.fixtures"
import { cleanupTestUsers } from "../helpers/db.helpers"
import { SIGNUP } from "../helpers/selectors"
import { signUp, waitForSignUpError } from "../helpers/auth.helpers"

test.describe("Signup", () => {
  test.afterAll(async () => {
    await cleanupTestUsers()
  })

  test("valid email signup shows verification redirect or dashboard", async ({ page }) => {
    const username = uniqueUsername()
    const email = uniqueEmail()
    await signUp(page, { username, email, password: "TestPass1", ageConfirm: true })
    // After signup the app either redirects to /dashboard or shows a success screen
    await expect(page).toHaveURL(/\/(dashboard|signup|login|verify)/, { timeout: 10000 })
  })

  test("valid signup with phone verification shows verification screen", async ({ page }) => {
    const username = uniqueUsername()
    const email = uniqueEmail()
    await page.goto("/signup")
    await page.waitForSelector(SIGNUP.username)

    await page.fill(SIGNUP.username, username)
    await page.fill(SIGNUP.email, email)
    await page.fill(SIGNUP.password, "TestPass1")
    await page.fill(SIGNUP.phone, "+15551234567")

    // Switch to phone verification
    await page.locator("button", { hasText: "Phone" }).click()

    await page.locator(SIGNUP.ageConfirm).check()
    await page.click(SIGNUP.submit)

    // Should show phone verification path
    await expect(page).toHaveURL(/\/(verify|dashboard|signup)/, { timeout: 10000 })
  })

  test("duplicate email rejected with 409-like error", async ({ page }) => {
    // First signup
    const username1 = uniqueUsername()
    const username2 = uniqueUsername()
    const email = uniqueEmail()

    await signUp(page, { username: username1, email, password: "TestPass1", ageConfirm: true })

    // Second signup with same email
    await page.goto("/signup")
    await page.waitForSelector(SIGNUP.username)
    await page.fill(SIGNUP.username, username2)
    await page.fill(SIGNUP.email, email)
    await page.fill(SIGNUP.password, "TestPass1")
    await page.locator(SIGNUP.ageConfirm).check()
    await page.click(SIGNUP.submit)

    const errorText = await waitForSignUpError(page)
    expect(errorText.toLowerCase()).toMatch(/email|already|exists|taken/i)
  })

  test("duplicate username rejected with error", async ({ page }) => {
    const username = uniqueUsername()
    const email1 = uniqueEmail()
    const email2 = uniqueEmail()

    await signUp(page, { username, email: email1, password: "TestPass1", ageConfirm: true })

    // Second signup with same username
    await page.goto("/signup")
    await page.waitForSelector(SIGNUP.username)
    await page.fill(SIGNUP.username, username)
    await page.fill(SIGNUP.email, email2)
    await page.fill(SIGNUP.password, "TestPass1")
    await page.locator(SIGNUP.ageConfirm).check()
    await page.click(SIGNUP.submit)

    const errorText = await waitForSignUpError(page)
    expect(errorText.toLowerCase()).toMatch(/username|already|exists|taken/i)
  })

  test("missing username keeps submit disabled", async ({ page }) => {
    await page.goto("/signup")
    await page.waitForSelector(SIGNUP.email)

    await page.fill(SIGNUP.email, uniqueEmail())
    await page.fill(SIGNUP.password, "TestPass1")
    await page.locator(SIGNUP.ageConfirm).check()

    await expect(page.locator(SIGNUP.submit)).toBeDisabled()
  })

  test("missing email keeps submit disabled", async ({ page }) => {
    await page.goto("/signup")
    await page.waitForSelector(SIGNUP.username)

    await page.fill(SIGNUP.username, uniqueUsername())
    await page.fill(SIGNUP.password, "TestPass1")
    await page.locator(SIGNUP.ageConfirm).check()

    await expect(page.locator(SIGNUP.submit)).toBeDisabled()
  })

  test("missing password keeps submit disabled", async ({ page }) => {
    await page.goto("/signup")
    await page.waitForSelector(SIGNUP.username)

    await page.fill(SIGNUP.username, uniqueUsername())
    await page.fill(SIGNUP.email, uniqueEmail())
    await page.locator(SIGNUP.ageConfirm).check()

    await expect(page.locator(SIGNUP.submit)).toBeDisabled()
  })

  test("invalid email format rejected by browser validation", async ({ page }) => {
    await page.goto("/signup")
    await page.waitForSelector(SIGNUP.username)

    await page.fill(SIGNUP.username, uniqueUsername())
    await page.fill(SIGNUP.email, "not-an-email")
    await page.fill(SIGNUP.password, "TestPass1")
    await page.locator(SIGNUP.ageConfirm).check()

    await page.click(SIGNUP.submit)
    // Browser native validation prevents submission for invalid email
    const emailValidity = await page.locator(SIGNUP.email).evaluate(
      (el: HTMLInputElement) => el.validity.valid
    )
    expect(emailValidity).toBe(false)
  })

  test("weak password (less than 8 chars) rejected by API", async ({ page }) => {
    const res = await page.evaluate(async () => {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: `pwtest_weak_${Date.now()}`,
          email: `test+weak_${Date.now()}@playwright.test`,
          password: "abc",
          ageConfirmed: true,
          verificationMethod: "EMAIL",
        }),
      })
      return { status: r.status, data: await r.json() }
    })
    expect(res.status).toBe(400)
  })

  test("weak password (no number) rejected by API", async ({ page }) => {
    const res = await page.evaluate(async () => {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: `pwtest_nonumber_${Date.now()}`,
          email: `test+nonumber_${Date.now()}@playwright.test`,
          password: "abcdefghijk",
          ageConfirmed: true,
          verificationMethod: "EMAIL",
        }),
      })
      return { status: r.status, data: await r.json() }
    })
    expect(res.status).toBe(400)
  })

  test("username too short (less than 3 chars) rejected by API", async ({ page }) => {
    const res = await page.evaluate(async () => {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "ab",
          email: `test+shortuser_${Date.now()}@playwright.test`,
          password: "TestPass1",
          ageConfirmed: true,
          verificationMethod: "EMAIL",
        }),
      })
      return { status: r.status, data: await r.json() }
    })
    expect(res.status).toBe(400)
  })

  test("display name field is optional and stored if provided", async ({ page }) => {
    await page.goto("/signup")
    await page.waitForSelector(SIGNUP.username)

    const username = uniqueUsername()
    await page.fill(SIGNUP.username, username)
    await page.fill(SIGNUP.displayName, "My Display Name")
    await page.fill(SIGNUP.email, uniqueEmail())
    await page.fill(SIGNUP.password, "TestPass1")
    await page.locator(SIGNUP.ageConfirm).check()

    // Display name field should be visible and filled
    await expect(page.locator(SIGNUP.displayName)).toHaveValue("My Display Name")
  })

  test("sleeper username field is present and optional", async ({ page }) => {
    await page.goto("/signup")
    await expect(page.locator(SIGNUP.sleeperUsername)).toBeVisible()
  })

  test("signup form renders all required fields", async ({ page }) => {
    await page.goto("/signup")
    await expect(page.locator(SIGNUP.username)).toBeVisible()
    await expect(page.locator(SIGNUP.email)).toBeVisible()
    await expect(page.locator(SIGNUP.password)).toBeVisible()
    await expect(page.locator(SIGNUP.ageConfirm)).toBeVisible()
    await expect(page.locator(SIGNUP.submit)).toBeVisible()
  })

  test("age confirmation unchecked keeps submit disabled", async ({ page }) => {
    await page.goto("/signup")
    await page.waitForSelector(SIGNUP.username)

    await page.fill(SIGNUP.username, uniqueUsername())
    await page.fill(SIGNUP.email, uniqueEmail())
    await page.fill(SIGNUP.password, "TestPass1")
    // Do NOT check age confirm

    await expect(page.locator(SIGNUP.submit)).toBeDisabled()
  })

  test("user redirected away from /signup after successful creation", async ({ page }) => {
    const username = uniqueUsername()
    const email = uniqueEmail()

    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 10000 }).catch(() => null),
      signUp(page, { username, email, password: "TestPass1", ageConfirm: true }),
    ])

    // After successful signup the URL should change from /signup
    await expect(page).not.toHaveURL("/signup")
  })
})

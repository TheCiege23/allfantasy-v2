import { test, expect } from "@playwright/test"
import { createUserFixture, deleteTestUsers } from "../fixtures/user.fixtures"
import { signIn, signOut, getSession } from "../helpers/auth.helpers"
import { getSessionCookie } from "../helpers/api.helpers"
import type { UserFixture } from "../fixtures/user.fixtures"

test.describe("Session Management", () => {
  let testUser: UserFixture
  let testUser2: UserFixture

  test.beforeAll(async () => {
    testUser = await createUserFixture({
      username: "pwtest_session1",
      email: "test+session1@playwright.test",
      password: "TestPass123",
    })
    testUser2 = await createUserFixture({
      username: "pwtest_session2",
      email: "test+session2@playwright.test",
      password: "TestPass456",
    })
  })

  test.afterAll(async () => {
    await deleteTestUsers()
  })

  test("session persists across page reload", async ({ page }) => {
    await signIn(page, { login: testUser.email, password: testUser.password })
    await page.waitForURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 }).catch(() => {})

    const sessionBefore = await getSession(page)
    expect(sessionBefore?.user).toBeTruthy()

    await page.reload()
    await page.waitForLoadState("networkidle")

    const sessionAfter = await getSession(page)
    expect(sessionAfter?.user).toBeTruthy()
  })

  test("session persists in new tab", async ({ page, context }) => {
    await signIn(page, { login: testUser.email, password: testUser.password })
    await page.waitForURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 }).catch(() => {})

    // Open a new tab with the same context (shares cookies)
    const newTab = await context.newPage()
    await newTab.goto("/api/auth/session")
    const sessionData = await newTab.evaluate(async () => {
      const res = await fetch("/api/auth/session")
      return res.json()
    })

    expect(sessionData?.user).toBeTruthy()
    await newTab.close()
  })

  test("session cookie has httpOnly flag", async ({ page, context }) => {
    await signIn(page, { login: testUser.email, password: testUser.password })
    await page.waitForURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 }).catch(() => {})

    const cookies = await context.cookies()
    const sessionCookie =
      cookies.find((c) => c.name === "next-auth.session-token") ||
      cookies.find((c) => c.name === "__Secure-next-auth.session-token")

    expect(sessionCookie).toBeTruthy()
    expect(sessionCookie?.httpOnly).toBe(true)
  })

  test("session cookie has sameSite attribute", async ({ page, context }) => {
    await signIn(page, { login: testUser.email, password: testUser.password })
    await page.waitForURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 }).catch(() => {})

    const cookies = await context.cookies()
    const sessionCookie =
      cookies.find((c) => c.name === "next-auth.session-token") ||
      cookies.find((c) => c.name === "__Secure-next-auth.session-token")

    expect(sessionCookie).toBeTruthy()
    // sameSite should be "Lax" or "Strict" (not "None" without Secure)
    expect(["Lax", "Strict"]).toContain(sessionCookie?.sameSite)
  })

  test("session cookie is set after login", async ({ page, context }) => {
    await signIn(page, { login: testUser.email, password: testUser.password })
    await page.waitForURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 }).catch(() => {})

    const cookieValue = await getSessionCookie(context)
    expect(cookieValue).toBeTruthy()
  })

  test("logout endpoint clears session cookie", async ({ page, context }) => {
    await signIn(page, { login: testUser.email, password: testUser.password })
    await page.waitForURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 }).catch(() => {})

    // Verify session exists
    const sessionBefore = await getSession(page)
    expect(sessionBefore?.user).toBeTruthy()

    await signOut(page)

    // Check that session is cleared
    const sessionAfter = await getSession(page)
    expect(sessionAfter).toBeNull()
  })

  test("protected routes blocked immediately after logout", async ({ page }) => {
    await signIn(page, { login: testUser.email, password: testUser.password })
    await page.waitForURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 }).catch(() => {})

    await signOut(page)

    // Try to access protected route
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })

  test("multiple concurrent sessions work independently", async ({ browser }) => {
    // Create two separate browser contexts (independent sessions)
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    await signIn(page1, { login: testUser.email, password: testUser.password })
    await signIn(page2, { login: testUser2.email, password: testUser2.password })

    await page1.waitForURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 }).catch(() => {})
    await page2.waitForURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 }).catch(() => {})

    const session1 = await getSession(page1)
    const session2 = await getSession(page2)

    expect(session1?.user).toBeTruthy()
    expect(session2?.user).toBeTruthy()

    // Both sessions should have different users
    const email1 = (session1?.user as any)?.email
    const email2 = (session2?.user as any)?.email
    expect(email1).not.toBe(email2)

    await context1.close()
    await context2.close()
  })

  test("GET /api/auth/session returns authenticated user data", async ({ page }) => {
    await signIn(page, { login: testUser.email, password: testUser.password })
    await page.waitForURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 }).catch(() => {})

    const session = await page.evaluate(async () => {
      const res = await fetch("/api/auth/session")
      return { status: res.status, data: await res.json() }
    })

    expect(session.status).toBe(200)
    expect(session.data?.user).toBeTruthy()
    expect(session.data?.user?.email).toBe(testUser.email)
  })

  test("session token not exposed in browser console logs", async ({ page }) => {
    const consoleLogs: string[] = []
    page.on("console", (msg) => consoleLogs.push(msg.text()))

    await signIn(page, { login: testUser.email, password: testUser.password })
    await page.waitForURL(/\/(dashboard|leagues|rankings)/, { timeout: 10000 }).catch(() => {})

    // Check that no console logs contain the session token pattern
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find(
      (c) => c.name === "next-auth.session-token" || c.name === "__Secure-next-auth.session-token"
    )

    if (sessionCookie?.value) {
      const tokenLeaked = consoleLogs.some((log) => log.includes(sessionCookie.value))
      expect(tokenLeaked).toBe(false)
    }
  })

  test("/api/auth/me returns 401 when unauthenticated", async ({ page }) => {
    await page.context().clearCookies()
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/auth/me")
      return res.status
    })
    expect(result).toBe(401)
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

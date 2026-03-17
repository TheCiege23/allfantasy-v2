import { test as base, expect, type Page, type BrowserContext } from "@playwright/test"
import { signIn } from "../helpers/auth.helpers"
import type { UserFixture } from "./user.fixtures"

export type AuthFixtures = {
  authenticatedPage: Page
  unauthenticatedPage: Page
  authenticatedContext: BrowserContext
}

/**
 * Extended Playwright test fixture that provides authenticated and unauthenticated page contexts.
 *
 * Usage in tests:
 *   test("my test", async ({ authenticatedPage }) => { ... })
 */
export const test = base.extend<AuthFixtures & { testUser: UserFixture }>({
  testUser: async ({}, use) => {
    // This is intentionally left as a placeholder.
    // Tests that need a pre-seeded user should create one in beforeAll
    // and pass it via the `use` callback.
    await use({
      id: "",
      email: "",
      username: "",
      password: "",
    })
  },

  unauthenticatedPage: async ({ page }, use) => {
    // Clear any existing auth cookies to ensure unauthenticated state
    await page.context().clearCookies()
    await use(page)
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    if (testUser.email && testUser.password) {
      await signIn(page, { login: testUser.email, password: testUser.password })
      await page.waitForURL(/\/(dashboard|login)/, { timeout: 10000 }).catch(() => {})
    }
    await use(page)
  },

  authenticatedContext: async ({ context, testUser, page }, use) => {
    if (testUser.email && testUser.password) {
      await signIn(page, { login: testUser.email, password: testUser.password })
      await page.waitForURL(/\/(dashboard|login)/, { timeout: 10000 }).catch(() => {})
    }
    await use(context)
  },
})

export { expect }

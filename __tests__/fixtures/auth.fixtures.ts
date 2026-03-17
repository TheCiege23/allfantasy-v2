/**
 * Auth fixtures for Playwright tests.
 *
 * Provides a custom `test` and `expect` with auth-specific fixtures:
 *   - `authenticatedPage`: a page that is already signed in as a test user
 *   - `testUser`: credentials for the seeded test user
 */

import { test as base, expect, Page } from "@playwright/test"
import {
  createTestUser,
  deleteTestUser,
  disconnectTestPrisma,
} from "../helpers/db.helpers"
import { ROUTES, SELECTORS } from "../helpers/selectors"

type TestUser = {
  id: string
  email: string
  username: string
  password: string
}

type AuthFixtures = {
  testUser: TestUser
  authenticatedPage: Page
}

export const test = base.extend<AuthFixtures>({
  testUser: async ({}, use) => {
    const user = await createTestUser()
    await use(user)
    await deleteTestUser(user.email)
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    // Navigate to login and sign in
    await page.goto(ROUTES.login)
    await page.fill(SELECTORS.signin.login, testUser.email)
    await page.fill(SELECTORS.signin.password, testUser.password)
    await page.click(SELECTORS.signin.submit)
    await page.waitForURL(`**${ROUTES.dashboard}**`, { timeout: 15_000 })
    await use(page)
  },
})

export { expect }

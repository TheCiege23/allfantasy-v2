import { createTestUser, cleanupTestUsers } from "../helpers/db.helpers"

let userCounter = 0

/**
 * Generates a unique test username to avoid collisions between tests.
 */
export function uniqueUsername(prefix = "pwtest"): string {
  userCounter++
  return `${prefix}_${Date.now()}_${userCounter}`
}

/**
 * Generates a unique test email address.
 */
export function uniqueEmail(prefix = "user"): string {
  userCounter++
  return `test+${prefix}_${Date.now()}_${userCounter}@playwright.test`
}

export interface UserFixture {
  id: string
  email: string
  username: string
  password: string
}

/**
 * Creates a test user in the database with a known password.
 * Returns the user data including the plain-text password for use in signin tests.
 */
export async function createUserFixture(overrides: Partial<UserFixture> = {}): Promise<UserFixture> {
  const username = overrides.username || uniqueUsername()
  const email = overrides.email || uniqueEmail()
  const password = overrides.password || "TestPass123"

  const user = await createTestUser({ username, email, password })

  return { id: user.id, email, username, password }
}

/**
 * Creates multiple test users for concurrent session tests.
 */
export async function createMultipleUserFixtures(count: number): Promise<UserFixture[]> {
  const users: UserFixture[] = []
  for (let i = 0; i < count; i++) {
    users.push(await createUserFixture())
  }
  return users
}

/**
 * Deletes all test users created by this fixture module.
 */
export async function deleteTestUsers(): Promise<void> {
  await cleanupTestUsers()
}

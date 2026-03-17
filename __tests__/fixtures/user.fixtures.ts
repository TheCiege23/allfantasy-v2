/**
 * User creation helpers for Playwright tests.
 * Wraps db.helpers with convenient defaults for common test scenarios.
 */

import { createTestUser, deleteTestUser } from "../helpers/db.helpers"

export { createTestUser, deleteTestUser }

/**
 * Generate a unique test email to avoid collisions between test runs.
 */
export function uniqueEmail(prefix = "test") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
}

/**
 * Generate a unique test username.
 */
export function uniqueUsername(prefix = "testuser") {
  return `${prefix}_${Date.now().toString(36)}`
}

/**
 * A strong test password that passes server-side validation.
 */
export const TEST_PASSWORD = "TestPass123"

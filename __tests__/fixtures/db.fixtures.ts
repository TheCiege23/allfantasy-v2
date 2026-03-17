import { PrismaClient } from "@prisma/client"

/**
 * Singleton Prisma client for tests, connected to the test database.
 */
let _prisma: PrismaClient | null = null

export function getTestPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_TEST_URL || process.env.DATABASE_URL,
        },
      },
    })
  }
  return _prisma
}

/**
 * Disconnects the test Prisma client. Call in afterAll or teardown.
 */
export async function disconnectTestPrisma(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect()
    _prisma = null
  }
}

/**
 * Cleans up all test data created during a test run.
 * Targets rows identifiable as test data (email suffix or username prefix).
 */
export async function cleanupTestData(): Promise<void> {
  const prisma = getTestPrisma()

  try {
    // Delete password reset tokens for test users first (FK constraint)
    await (prisma as any).passwordResetToken.deleteMany({
      where: {
        user: {
          OR: [
            { email: { endsWith: "@playwright.test" } },
            { email: { startsWith: "test+" } },
            { username: { startsWith: "pwtest_" } },
          ],
        },
      },
    })
  } catch {
    // Table may not exist yet
  }

  // Delete test users (cascades to related records)
  await (prisma as any).appUser.deleteMany({
    where: {
      OR: [
        { email: { endsWith: "@playwright.test" } },
        { email: { startsWith: "test+" } },
        { username: { startsWith: "pwtest_" } },
      ],
    },
  })
}

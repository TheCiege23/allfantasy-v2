import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_TEST_URL || process.env.DATABASE_URL,
    },
  },
})

export interface TestUserData {
  username: string
  email: string
  password: string
  displayName?: string
}

/**
 * Creates a test user directly in the database with a hashed password.
 * Skips registration flow — use when you need a user that can log in.
 */
export async function createTestUser(data: TestUserData): Promise<{ id: string; email: string; username: string }> {
  const passwordHash = await bcrypt.hash(data.password, 10)

  const user = await (prisma as any).appUser.create({
    data: {
      email: data.email.toLowerCase(),
      username: data.username.toLowerCase(),
      passwordHash,
      displayName: data.displayName || data.username,
    },
    select: { id: true, email: true, username: true },
  })

  return user
}

/**
 * Deletes all test users whose email starts with "test+" or "pw_test" prefix.
 * Keeps production data intact.
 */
export async function cleanupTestUsers(db?: PrismaClient): Promise<void> {
  const client = db || prisma
  await (client as any).appUser.deleteMany({
    where: {
      OR: [
        { email: { startsWith: "test+" } },
        { email: { endsWith: "@playwright.test" } },
        { username: { startsWith: "pwtest_" } },
      ],
    },
  })
}

/**
 * Fetches a user from the database by ID.
 */
export async function getUserFromDB(userId: string) {
  return (prisma as any).appUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      passwordHash: true,
      createdAt: true,
    },
  })
}

/**
 * Creates a password reset token for a test user.
 * Returns the raw token (pre-hash) suitable for constructing the reset URL.
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const crypto = await import("crypto")
  const rawToken = crypto.randomBytes(32).toString("hex")
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

  await (prisma as any).passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  })

  return rawToken
}

/**
 * Creates an expired password reset token for testing rejection of stale tokens.
 */
export async function createExpiredPasswordResetToken(userId: string): Promise<string> {
  const crypto = await import("crypto")
  const rawToken = crypto.randomBytes(32).toString("hex")
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
  const expiresAt = new Date(Date.now() - 1000) // already expired

  await (prisma as any).passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  })

  return rawToken
}

export { prisma as testPrisma }

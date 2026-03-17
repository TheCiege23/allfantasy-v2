/**
 * Database helpers for test setup and teardown.
 *
 * These utilities use direct Prisma access to seed and clean up test data.
 * They are intended to be called from Playwright fixture setup/teardown hooks.
 *
 * NOTE: Requires DATABASE_URL to point to a test database.
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import crypto from "crypto"

// Lazily create a Prisma client for test use
let _prisma: PrismaClient | null = null

export function getTestPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    })
  }
  return _prisma
}

export async function disconnectTestPrisma() {
  if (_prisma) {
    await _prisma.$disconnect()
    _prisma = null
  }
}

export function makeToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url")
}

export function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

/**
 * Create a test user directly in the database.
 * Returns { id, email, username, password } for use in tests.
 */
export async function createTestUser(
  overrides: {
    email?: string
    username?: string
    password?: string
    displayName?: string
    emailVerified?: boolean
  } = {}
) {
  const db = getTestPrisma() as any
  const ts = Date.now()
  const email = overrides.email ?? `test-${ts}@example.com`
  const username = overrides.username ?? `testuser_${ts}`
  const password = overrides.password ?? "TestPass123"
  const displayName = overrides.displayName ?? username

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await db.appUser.create({
    data: {
      email,
      username,
      passwordHash,
      displayName,
      emailVerified: overrides.emailVerified ?? false,
    },
    select: { id: true, email: true, username: true },
  })

  await db.userProfile.create({
    data: {
      userId: user.id,
      displayName,
      verificationMethod: "EMAIL",
      ageConfirmedAt: new Date(),
      profileComplete: false,
    },
  })

  return { ...user, password }
}

/**
 * Delete a test user and all related data by email.
 */
export async function deleteTestUser(email: string) {
  const db = getTestPrisma() as any
  const user = await db.appUser.findUnique({
    where: { email },
    select: { id: true },
  }).catch(() => null)

  if (!user) return

  await db.emailVerifyToken.deleteMany({ where: { userId: user.id } }).catch(() => {})
  await db.passwordResetToken.deleteMany({ where: { userId: user.id } }).catch(() => {})
  await db.userProfile.deleteMany({ where: { userId: user.id } }).catch(() => {})
  await db.appUser.delete({ where: { id: user.id } }).catch(() => {})
}

/**
 * Create a password reset token for a user and return the raw token.
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const db = getTestPrisma() as any
  const rawToken = makeToken(32)
  const tokenHash = sha256Hex(rawToken)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

  await db.passwordResetToken.deleteMany({ where: { userId } }).catch(() => {})
  await db.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } })

  return rawToken
}

/**
 * Create an expired password reset token for a user and return the raw token.
 */
export async function createExpiredPasswordResetToken(userId: string): Promise<string> {
  const db = getTestPrisma() as any
  const rawToken = makeToken(32)
  const tokenHash = sha256Hex(rawToken)
  const expiresAt = new Date(Date.now() - 1000) // already expired

  await db.passwordResetToken.deleteMany({ where: { userId } }).catch(() => {})
  await db.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } })

  return rawToken
}

/**
 * Clean up any users matching a test email prefix.
 */
export async function cleanupTestUsers(emailPrefix: string) {
  const db = getTestPrisma() as any
  const users = await db.appUser.findMany({
    where: { email: { startsWith: emailPrefix } },
    select: { id: true, email: true },
  }).catch(() => [])

  for (const u of users) {
    await deleteTestUser(u.email)
  }
}

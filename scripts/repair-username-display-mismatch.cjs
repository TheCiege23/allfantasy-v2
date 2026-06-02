#!/usr/bin/env node

/**
 * Detects and optionally repairs AppUser.username/displayName mismatches where
 * users see a clean name but must log in with a hidden suffixed username.
 *
 * Dry run:
 *   node scripts/repair-username-display-mismatch.cjs
 *
 * Repair one account after reviewing dry-run output:
 *   USERNAME_REPAIR_APPLY=1 USERNAME_REPAIR_TARGET_EMAIL=user@example.com USERNAME_REPAIR_TARGET_USERNAME=TheCiege26 node scripts/repair-username-display-mismatch.cjs
 *
 * The script never overwrites another account. It checks desired username
 * conflicts case-insensitively and exits without writing if a conflict exists.
 */

const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/

function normalize(value) {
  return String(value ?? "").trim()
}

function lookup(value) {
  return normalize(value).toLowerCase()
}

function maskEmail(email) {
  const text = normalize(email)
  if (!text.includes("@")) return null
  const [name, domain] = text.split("@")
  const safeName = name.length <= 2 ? `${name[0] ?? "*"}*` : `${name.slice(0, 2)}***`
  return `${safeName}@${domain}`
}

function suffixBase(username) {
  const match = normalize(username).match(/^(.+)_\d+$/)
  return match?.[1] ?? null
}

function validUsername(username) {
  return USERNAME_RE.test(normalize(username))
}

function likelyDisplayLoginMismatch(user) {
  const username = normalize(user.username)
  const base = suffixBase(username)
  if (!base) return null

  const candidates = [
    user.displayName,
    user.profile?.displayName,
    base,
  ]
    .map(normalize)
    .filter(Boolean)

  const candidate = candidates.find((value) => lookup(value) === lookup(base) && validUsername(value))
  if (!candidate) return null

  return {
    userId: user.id,
    email: maskEmail(user.email),
    currentUsername: username,
    displayedUsername: candidate,
    suggestedUsername: candidate,
  }
}

async function findTargetUser() {
  const targetUserId = normalize(process.env.USERNAME_REPAIR_TARGET_USER_ID)
  const targetEmail = normalize(process.env.USERNAME_REPAIR_TARGET_EMAIL)
  const targetUsername = normalize(process.env.USERNAME_REPAIR_TARGET_USERNAME || "TheCiege26")

  if (targetUserId) {
    return prisma.appUser.findUnique({
      where: { id: targetUserId },
      include: { profile: { select: { displayName: true } } },
    })
  }

  return prisma.appUser.findFirst({
    where: {
      OR: [
        ...(targetEmail ? [{ email: { equals: targetEmail, mode: "insensitive" } }] : []),
        { username: { equals: targetUsername, mode: "insensitive" } },
        { displayName: { equals: targetUsername, mode: "insensitive" } },
        { profile: { is: { displayName: { equals: targetUsername, mode: "insensitive" } } } },
      ],
    },
    include: { profile: { select: { displayName: true } } },
  })
}

async function dryRun() {
  const users = await prisma.appUser.findMany({
    where: { username: { contains: "_" } },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      profile: { select: { displayName: true } },
    },
    take: 500,
    orderBy: { createdAt: "desc" },
  })

  const mismatches = users.map(likelyDisplayLoginMismatch).filter(Boolean)
  console.log(`[username-repair] likely mismatches: ${mismatches.length}`)
  for (const row of mismatches) {
    console.log(
      JSON.stringify({
        userId: row.userId,
        email: row.email,
        currentUsername: row.currentUsername,
        displayedUsername: row.displayedUsername,
        suggestedUsername: row.suggestedUsername,
      })
    )
  }
}

async function repairTarget() {
  const desiredUsername = normalize(process.env.USERNAME_REPAIR_TARGET_USERNAME || "TheCiege26")
  if (!validUsername(desiredUsername)) {
    console.error("[username-repair] desired username is invalid.")
    process.exitCode = 1
    return
  }

  const user = await findTargetUser()
  if (!user) {
    console.error("[username-repair] target account not found.")
    process.exitCode = 1
    return
  }

  const conflict = await prisma.appUser.findFirst({
    where: {
      username: { equals: desiredUsername, mode: "insensitive" },
      NOT: { id: user.id },
    },
    select: { id: true, username: true, email: true },
  })

  if (conflict) {
    console.error(
      `[username-repair] conflict: ${desiredUsername} is already held by user ${conflict.id} (${maskEmail(conflict.email) ?? "no-email"}). No changes made.`
    )
    process.exitCode = 2
    return
  }

  if (lookup(user.username) === lookup(desiredUsername) && user.username === desiredUsername) {
    console.log(`[username-repair] ${desiredUsername} is already canonical for user ${user.id}.`)
    return
  }

  await prisma.appUser.update({
    where: { id: user.id },
    data: { username: desiredUsername },
    select: { id: true },
  })

  console.log(`[username-repair] repaired user ${user.id}: username is now ${desiredUsername}.`)
}

async function main() {
  const apply = process.env.USERNAME_REPAIR_APPLY === "1"
  await dryRun()
  if (!apply) {
    console.log("[username-repair] dry run only. Set USERNAME_REPAIR_APPLY=1 to repair the target account.")
    return
  }
  await repairTarget()
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("[username-repair] failed:", error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

module.exports = {
  likelyDisplayLoginMismatch,
  validUsername,
}

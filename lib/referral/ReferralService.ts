/**
 * ReferralService — referral links, tracking, and attribution.
 */

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import crypto from "crypto"

const REFERRAL_CODE_LENGTH = 10
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function generateCode(): string {
  let code = ""
  const bytes = crypto.randomBytes(REFERRAL_CODE_LENGTH)
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length]
  }
  return code
}

export async function getOrCreateReferralCode(userId: string): Promise<{ code: string }> {
  const existing = await prisma.referralCode.findFirst({
    where: { userId },
    select: { code: true },
  })
  if (existing) return { code: existing.code }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    const found = await prisma.referralCode.findUnique({ where: { code }, select: { id: true } })
    if (!found) {
      await prisma.referralCode.create({
        data: { userId, code },
      })
      return { code }
    }
  }
  const fallback = generateCode() + Date.now().toString(36).slice(-4)
  await prisma.referralCode.create({
    data: { userId, code: fallback },
  })
  return { code: fallback }
}

export function buildReferralLink(code: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, "")
  return `${base}/?ref=${encodeURIComponent(code)}`
}

export async function getReferrerIdByCode(code: string): Promise<string | null> {
  const row = await prisma.referralCode.findUnique({
    where: { code: code.trim().toUpperCase() },
    select: { userId: true },
  })
  return row?.userId ?? null
}

export async function recordClick(referrerId: string, metadata?: { userAgent?: string }): Promise<void> {
  await prisma.referralEvent.create({
    data: {
      referrerId,
      type: "click",
      metadata: metadata ?? undefined,
    },
  })
}

/** Record a share event (channel: copy_link | sms | email | twitter | etc.) for referral analytics. */
export async function recordShare(
  referrerId: string,
  channel: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.referralEvent.create({
    data: {
      referrerId,
      type: "share",
      metadata: { channel, ...metadata } as object,
    },
  })
}

export async function attributeSignup(referredUserId: string, referralCode: string): Promise<{ referrerId: string } | null> {
  const referrerId = await getReferrerIdByCode(referralCode)
  if (!referrerId) return null
  return attributeSignupToReferrer(referredUserId, referrerId)
}

/**
 * Attribute a referred signup directly to a referrer user id.
 * Idempotent for the same referred user due ReferralEvent.referredUserId unique constraint.
 */
export async function attributeSignupToReferrer(
  referredUserId: string,
  referrerId: string
): Promise<{ referrerId: string } | null> {
  if (!referrerId || referrerId === referredUserId) return null

  const existing = await prisma.referralEvent.findFirst({
    where: { referredUserId },
    select: { referrerId: true },
  })
  if (existing) {
    return existing.referrerId === referrerId ? { referrerId } : null
  }

  try {
    await prisma.referralEvent.create({
      data: {
        referrerId,
        referredUserId,
        type: "signup",
      },
    })
  } catch (error) {
    // Keep attribution idempotent under concurrency races.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error
    }
    const raced = await prisma.referralEvent.findFirst({
      where: { referredUserId },
      select: { referrerId: true },
    })
    return raced?.referrerId === referrerId ? { referrerId } : null
  }

  return { referrerId }
}

export interface ReferralStats {
  clicks: number
  signups: number
  pendingRewards: number
  redeemedRewards: number
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const [clicks, signups, pending, redeemed] = await Promise.all([
    prisma.referralEvent.count({ where: { referrerId: userId, type: "click" } }),
    prisma.referralEvent.count({ where: { referrerId: userId, type: "signup" } }),
    prisma.referralReward.count({ where: { userId, status: "pending" } }),
    prisma.referralReward.count({ where: { userId, status: "redeemed" } }),
  ])
  return { clicks, signups, pendingRewards: pending, redeemedRewards: redeemed }
}

/** Who did this user refer? Returns list of referred signups (for "who invited who" UI). */
export async function getReferredUsers(
  referrerId: string
): Promise<{ referredUserId: string; displayName: string | null; createdAt: Date }[]> {
  const events = await prisma.referralEvent.findMany({
    where: { referrerId, type: "signup", referredUserId: { not: null } },
    select: { referredUserId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  const userIds = events.map((e) => e.referredUserId!).filter(Boolean)
  if (userIds.length === 0) return []
  const users = await prisma.appUser.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))
  return events.map((e) => {
    const u = userMap.get(e.referredUserId!)
    return {
      referredUserId: e.referredUserId!,
      displayName: u?.displayName ?? null,
      createdAt: e.createdAt,
    }
  })
}

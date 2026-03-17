/**
 * ReferralService — referral links, tracking, and attribution.
 */

import { prisma } from "@/lib/prisma"
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

export async function attributeSignup(referredUserId: string, referralCode: string): Promise<{ referrerId: string } | null> {
  const referrerId = await getReferrerIdByCode(referralCode)
  if (!referrerId || referrerId === referredUserId) return null

  await prisma.referralEvent.create({
    data: {
      referrerId,
      referredUserId,
      type: "signup",
    },
  })
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

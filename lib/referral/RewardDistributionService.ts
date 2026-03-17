/**
 * RewardDistributionService — grant and redeem referral rewards (PROMPT 143).
 * Supports configurable reward types; optional XP/badge integration.
 */

import { prisma } from "@/lib/prisma"

export const REWARD_TYPE_SIGNUP = "referral_signup"

/** Admin-configurable reward type labels (extend for future reward types). */
export const REWARD_TYPE_LABELS: Record<string, string> = {
  [REWARD_TYPE_SIGNUP]: "Referred a friend",
  referral_join: "Referred a join",
}

const REDEEM_RATE_LIMIT_PER_MINUTE = 20

export async function grantRewardForSignup(referrerId: string): Promise<{ id: string }> {
  const reward = await prisma.referralReward.create({
    data: {
      userId: referrerId,
      type: REWARD_TYPE_SIGNUP,
      status: "pending",
      metadata: { reason: "referred_signup" },
    },
    select: { id: true },
  })
  return { id: reward.id }
}

export async function listRewards(userId: string): Promise<
  { id: string; type: string; status: string; grantedAt: Date; redeemedAt: Date | null }[]
> {
  const list = await prisma.referralReward.findMany({
    where: { userId },
    orderBy: { grantedAt: "desc" },
    select: { id: true, type: true, status: true, grantedAt: true, redeemedAt: true },
  })
  return list
}

export async function redeemReward(rewardId: string, userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const reward = await prisma.referralReward.findFirst({
    where: { id: rewardId, userId },
    select: { id: true, status: true, type: true },
  })
  if (!reward) return { ok: false, error: "Reward not found" }
  if (reward.status === "redeemed") return { ok: false, error: "Already redeemed" }

  const since = new Date()
  since.setMinutes(since.getMinutes() - 1)
  const recentRedeems = await prisma.referralReward.count({
    where: { userId, status: "redeemed", redeemedAt: { gte: since } },
  })
  if (recentRedeems >= REDEEM_RATE_LIMIT_PER_MINUTE) {
    return { ok: false, error: "Too many redemptions; try again shortly" }
  }

  await prisma.referralReward.update({
    where: { id: rewardId },
    data: { status: "redeemed", redeemedAt: new Date() },
  })

  // Optional: integrate with badge-engine or xp-progression when reward types support it.
  // e.g. checkAndAwardBadge(userId, undefined, "referral_ambassador") or grantReferralXP(userId)

  return { ok: true }
}

export function getRewardLabel(type: string): string {
  return REWARD_TYPE_LABELS[type] ?? type
}

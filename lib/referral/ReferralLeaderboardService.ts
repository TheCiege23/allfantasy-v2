/**
 * Referral leaderboard and creator referral tiers (PROMPT 143).
 * Supports user and creator referrals; tiers based on signup count.
 */

import { prisma } from "@/lib/prisma"

export type LeaderboardSort = "signups" | "clicks" | "rewards"

export interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string | null
  username: string
  avatarUrl: string | null
  isCreator: boolean
  signups: number
  clicks: number
  redeemedRewards: number
  tier: string
}

/** Creator referral tiers by signup count (admin can replace with DB config later). */
export const REFERRAL_TIERS = [
  { minSignups: 0, id: "starter", label: "Starter" },
  { minSignups: 3, id: "bronze", label: "Bronze Ambassador" },
  { minSignups: 10, id: "silver", label: "Silver Ambassador" },
  { minSignups: 25, id: "gold", label: "Gold Ambassador" },
  { minSignups: 50, id: "elite", label: "Elite Ambassador" },
  { minSignups: 100, id: "legend", label: "Legend" },
] as const

export function getTierForSignups(signups: number, isCreator?: boolean): { id: string; label: string } {
  let matched: (typeof REFERRAL_TIERS)[number] = REFERRAL_TIERS[0]
  for (const t of REFERRAL_TIERS) {
    if (signups >= t.minSignups) matched = t
  }
  return { id: matched.id, label: matched.label }
}

export async function getReferralLeaderboard(
  options: { limit?: number; sortBy?: LeaderboardSort } = {}
): Promise<LeaderboardEntry[]> {
  const { limit = 50, sortBy = "signups" } = options

  const signupCounts = await prisma.referralEvent.groupBy({
    by: ["referrerId"],
    where: { type: "signup" },
    _count: { id: true },
  })
  const clickCounts = await prisma.referralEvent.groupBy({
    by: ["referrerId"],
    where: { type: "click" },
    _count: { id: true },
  })
  const redeemedCounts = await prisma.referralReward.groupBy({
    by: ["userId"],
    where: { status: "redeemed" },
    _count: { id: true },
  })

  const userIds = [...new Set([
    ...signupCounts.map((s) => s.referrerId),
    ...clickCounts.map((c) => c.referrerId),
    ...redeemedCounts.map((r) => r.userId),
  ])]

  if (userIds.length === 0) return []

  const users = await prisma.appUser.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      creatorProfile: { select: { id: true } },
    },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))

  const entries: LeaderboardEntry[] = userIds.map((userId) => {
    const signups = signupCounts.find((s) => s.referrerId === userId)?._count?.id ?? 0
    const clicks = clickCounts.find((c) => c.referrerId === userId)?._count?.id ?? 0
    const redeemedRewards = redeemedCounts.find((r) => r.userId === userId)?._count?.id ?? 0
    const user = userMap.get(userId)
    const isCreator = !!user?.creatorProfile
    const tier = getTierForSignups(signups, isCreator)
    return {
      rank: 0,
      userId,
      displayName: user?.displayName ?? null,
      username: user?.username ?? "",
      avatarUrl: user?.avatarUrl ?? null,
      isCreator,
      signups,
      clicks,
      redeemedRewards,
      tier: tier.label,
    }
  })

  const sortKey = sortBy === "clicks" ? "clicks" : sortBy === "rewards" ? "redeemedRewards" : "signups"
  entries.sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number))
  entries.forEach((e, i) => { e.rank = i + 1 })

  return entries.slice(0, limit)
}

export async function getReferrerProgress(userId: string): Promise<{
  signups: number
  clicks: number
  pendingRewards: number
  redeemedRewards: number
  tier: { id: string; label: string }
  nextMilestone: { signups: number; label: string } | null
  milestones: { signups: number; label: string; achieved: boolean }[]
}> {
  const [signups, clicks, pending, redeemed] = await Promise.all([
    prisma.referralEvent.count({ where: { referrerId: userId, type: "signup" } }),
    prisma.referralEvent.count({ where: { referrerId: userId, type: "click" } }),
    prisma.referralReward.count({ where: { userId, status: "pending" } }),
    prisma.referralReward.count({ where: { userId, status: "redeemed" } }),
  ])

  const creator = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { id: true },
  })
  const tier = getTierForSignups(signups, !!creator)

  const milestones = REFERRAL_TIERS.map((t) => ({
    signups: t.minSignups,
    label: t.label,
    achieved: signups >= t.minSignups,
  }))
  const nextMilestone = milestones.find((m) => !m.achieved) ?? null

  return {
    signups,
    clicks,
    pendingRewards: pending,
    redeemedRewards: redeemed,
    tier,
    nextMilestone: nextMilestone ? { signups: nextMilestone.signups, label: nextMilestone.label } : null,
    milestones,
  }
}

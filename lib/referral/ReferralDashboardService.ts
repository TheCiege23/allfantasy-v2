import { buildReferralLink, getOrCreateReferralCode, getReferralStats, getReferredUsers } from "./ReferralService"
import { getReferralLeaderboard, getReferrerProgress } from "./ReferralLeaderboardService"
import { listRewards } from "./RewardDistributionService"
import type { ReferralDashboardData, ReferralFunnelView } from "./types"
import { prisma } from "@/lib/prisma"

function buildCTACards(audience: "user" | "creator"): ReferralDashboardData["ctaCards"] {
  return [
    {
      id: "share",
      title: "Share your referral link",
      description:
        audience === "creator"
          ? "Bring new followers, listeners, and league members into your creator ecosystem."
          : "Invite friends into AllFantasy and turn signups into XP, badges, and rank.",
      href: "/referral",
      label: "Share now",
      variant: "default",
    },
    {
      id: "leaderboard",
      title: "Climb the referral leaderboard",
      description: "See where you rank against the platform’s most effective recruiters.",
      href: "/referral?tab=leaderboard",
      label: "Open leaderboard",
      variant: "leaderboard",
    },
    {
      id: "rewards",
      title: "Claim referral rewards",
      description: "Turn successful referrals into progression rewards and creator credibility.",
      href: "/referral?tab=rewards",
      label: "View rewards",
      variant: "rewards",
    },
  ]
}

async function getFunnel(userId: string): Promise<ReferralFunnelView> {
  const [clicked, signedUp, engaged, onboarded, rewarded] = await Promise.all([
    prisma.referralEvent.count({ where: { referrerId: userId, type: "click" } }),
    prisma.referral.count({ where: { referrerId: userId, signupCompletedAt: { not: null } } }),
    prisma.referral.count({
      where: {
        referrerId: userId,
        OR: [{ status: "engaged" }, { onboardingStartedAt: { not: null } }],
      },
    }),
    prisma.referral.count({ where: { referrerId: userId, onboardingCompletedAt: { not: null } } }),
    prisma.referral.count({ where: { referrerId: userId, rewardGrantedAt: { not: null } } }),
  ])

  return {
    clicked,
    signedUp,
    engaged,
    onboarded,
    rewarded,
  }
}

export async function getReferralDashboardData(
  userId: string,
  baseUrl: string
): Promise<ReferralDashboardData> {
  const [{ code }, stats, progress, rewards, leaderboard, referred, funnel] = await Promise.all([
    getOrCreateReferralCode(userId),
    getReferralStats(userId),
    getReferrerProgress(userId),
    listRewards(userId),
    getReferralLeaderboard({ limit: 25, sortBy: "signups" }),
    getReferredUsers(userId),
    getFunnel(userId),
  ])

  return {
    code,
    link: buildReferralLink(code, baseUrl),
    audience: progress.audience,
    stats,
    progress,
    rewards,
    leaderboard,
    referred,
    funnel,
    ctaCards: buildCTACards(progress.audience),
    updatedAt: new Date().toISOString(),
  }
}

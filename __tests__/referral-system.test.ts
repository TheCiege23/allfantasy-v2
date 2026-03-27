import { describe, expect, it } from "vitest"
import { buildReferralLink } from "@/lib/referral/ReferralService"
import { getTierForSignups } from "@/lib/referral/ReferralLeaderboardService"
import { getRewardLabel, REWARD_TYPE_SIGNUP } from "@/lib/referral/RewardDistributionService"
import { GENERATED_XP_EVENT_TYPES, XP_EVENT_TYPES } from "@/lib/xp-progression/types"

describe("referral system helpers", () => {
  it("builds deterministic referral links", () => {
    expect(buildReferralLink("AF143CODE", "https://allfantasy.test")).toBe(
      "https://allfantasy.test/?ref=AF143CODE"
    )
  })

  it("resolves referral tiers from signup totals", () => {
    expect(getTierForSignups(0)).toEqual({ id: "starter", label: "Starter" })
    expect(getTierForSignups(12)).toEqual({ id: "silver", label: "Silver Ambassador" })
    expect(getTierForSignups(101)).toEqual({ id: "legend", label: "Legend" })
  })

  it("keeps referral rewards and XP bonuses available without wiping manual XP events", () => {
    expect(getRewardLabel(REWARD_TYPE_SIGNUP)).toBe("Referral XP")
    expect(XP_EVENT_TYPES).toContain("referral_bonus")
    expect(XP_EVENT_TYPES).toContain("creator_referral_bonus")
    expect(GENERATED_XP_EVENT_TYPES).not.toContain("referral_bonus")
  })
})

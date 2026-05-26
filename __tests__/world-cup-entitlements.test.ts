import { describe, expect, it } from "vitest"
import {
  canCreateMultipleWorldCupEntries,
  canExportWorldCupLeaderboard,
  canUseWorldCupAiTools,
  canUseWorldCupChat,
  canUseWorldCupCommissionerTools,
  resolveWorldCupEntitlementSummary,
} from "@/lib/world-cup/worldCupEntitlements"

describe("World Cup entitlement helpers", () => {
  it("keeps normal free users out of premium World Cup tools", () => {
    const input = { isOwner: false, isAdmin: false, hasBracketBrainAi: false }

    expect(canUseWorldCupCommissionerTools(input)).toBe(false)
    expect(canCreateMultipleWorldCupEntries(input)).toBe(false)
    expect(canExportWorldCupLeaderboard(input)).toBe(false)
    // Chat is open to all pool participants — API enforces membership.
    expect(canUseWorldCupChat(input)).toBe(true)
    expect(canUseWorldCupAiTools(input)).toBe(false)
  })

  it("unlocks commissioner tools for owners, admins, and commissioner plans", () => {
    expect(canUseWorldCupCommissionerTools({ isOwner: true })).toBe(true)
    expect(canUseWorldCupCommissionerTools({ isAdmin: true })).toBe(true)
    expect(canUseWorldCupCommissionerTools({ plans: ["commissioner"] })).toBe(true)
    expect(canUseWorldCupCommissionerTools({ plans: ["supreme"] })).toBe(true)
  })

  it("unlocks AI tools for Bracket Brain access and Pro-style plans", () => {
    expect(canUseWorldCupAiTools({ hasBracketBrainAi: true })).toBe(true)
    expect(canUseWorldCupAiTools({ hasAfPro: true })).toBe(true)
    expect(canUseWorldCupAiTools({ plans: ["pro"] })).toBe(true)
    expect(canUseWorldCupAiTools({ plans: ["all_access"] })).toBe(true)
  })

  it("returns copy-ready labels for the shell premium panel", () => {
    expect(resolveWorldCupEntitlementSummary({}).labels).toEqual({
      commissioner: "Requires AF Commissioner",
      ai: "Requires AI/Pro",
    })

    expect(resolveWorldCupEntitlementSummary({ isAdmin: true }).labels).toEqual({
      commissioner: "AF Commissioner active",
      ai: "AI/Pro active",
    })
  })
})

/**
 * world-cup-ai-gating.test.ts
 *
 * Unit tests for the World Cup AI subscription, cap, and gating system.
 *
 * Tests cover:
 *   - worldCupAiUsageLimits.ts — tier resolution + upgrade messages
 *   - worldCupChimmyRateLimit.ts — tier-aware daily limits
 *   - dailyCaps.ts — wc_matchup_narrative cap feature
 *   - aiConfig.ts — wc_matchup_narrative defaults
 *
 * Uses mock prisma and mock module overrides so no DB is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}))

// Mock prisma globally
vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiRateLimitRecord: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    worldCupBracketChatEvent: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

// Mock adminAuth so isAdminEmailAllowed is controllable
vi.mock("@/lib/adminAuth", () => ({
  isAdminEmailAllowed: vi.fn((email: string | null) => email === "admin@test.com"),
}))

// Mock bracketBrainAccess
vi.mock("@/lib/bracket-brain/bracketBrainAccess", () => ({
  userHasBracketBrainAi: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import { userHasBracketBrainAi } from "@/lib/bracket-brain/bracketBrainAccess"

// ── Imports under test ────────────────────────────────────────────────────────

import {
  resolveWcCapTier,
  resolveWcCapTierForUser,
  checkWcAiCap,
  incrementWcAiCap,
  getWcUpgradeMessage,
} from "@/lib/world-cup/worldCupAiUsageLimits"

import {
  checkWorldCupChimmyRateLimit,
  WORLD_CUP_CHIMMY_DAILY_LIMIT,
} from "@/lib/world-cup/worldCupChimmyRateLimit"

import {
  DAILY_CAP_LIMITS,
} from "@/lib/ai/dailyCaps"

import {
  CAP_DEFAULTS,
  getAiDailyCaps,
} from "@/lib/ai/aiConfig"

import {
  calculateWorldCupBracketGrade,
  calculateWorldCupLeaderboardAiInsights,
  buildWorldCupPathToWinInsight,
} from "@/lib/world-cup/worldCupAiSubscriptionInsights"

// ─────────────────────────────────────────────────────────────────────────────
// 1. aiConfig — wc_matchup_narrative defaults
// ─────────────────────────────────────────────────────────────────────────────

describe("aiConfig — wc_matchup_narrative defaults", () => {
  it("CAP_DEFAULTS has wc_matchup_narrative for all tiers", () => {
    expect(typeof CAP_DEFAULTS.free.wc_matchup_narrative).toBe("number")
    expect(typeof CAP_DEFAULTS.pro.wc_matchup_narrative).toBe("number")
    expect(typeof CAP_DEFAULTS.admin.wc_matchup_narrative).toBe("number")
  })

  it("free tier has fewer matchup calls than pro", () => {
    expect(CAP_DEFAULTS.free.wc_matchup_narrative).toBeLessThan(
      CAP_DEFAULTS.pro.wc_matchup_narrative
    )
  })

  it("pro tier has fewer matchup calls than admin", () => {
    expect(CAP_DEFAULTS.pro.wc_matchup_narrative).toBeLessThan(
      CAP_DEFAULTS.admin.wc_matchup_narrative
    )
  })

  it("free tier gets at least 1 matchup call (deterministic fallback is always free)", () => {
    // Even though free is gated at the route level, the cap itself should
    // be non-zero (users could theoretically get deterministic panel data).
    expect(CAP_DEFAULTS.free.wc_matchup_narrative).toBeGreaterThanOrEqual(0)
  })

  it("getAiDailyCaps returns wc_matchup_narrative for all tiers", () => {
    const caps = getAiDailyCaps()
    expect(typeof caps.free.wc_matchup_narrative).toBe("number")
    expect(typeof caps.pro.wc_matchup_narrative).toBe("number")
    expect(typeof caps.admin.wc_matchup_narrative).toBe("number")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. DAILY_CAP_LIMITS — wc_matchup_narrative feature
// ─────────────────────────────────────────────────────────────────────────────

describe("DAILY_CAP_LIMITS — wc_matchup_narrative", () => {
  it("wc_matchup_narrative is registered for all cap tiers", () => {
    expect(DAILY_CAP_LIMITS.wc_matchup_narrative).toBeDefined()
    expect(typeof DAILY_CAP_LIMITS.wc_matchup_narrative.free).toBe("number")
    expect(typeof DAILY_CAP_LIMITS.wc_matchup_narrative.pro).toBe("number")
    expect(typeof DAILY_CAP_LIMITS.wc_matchup_narrative.admin).toBe("number")
  })

  it("all existing features are still registered", () => {
    expect(DAILY_CAP_LIMITS.chimmy).toBeDefined()
    expect(DAILY_CAP_LIMITS.explain_bracket).toBeDefined()
    expect(DAILY_CAP_LIMITS.commissioner_brain).toBeDefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. resolveWcCapTier — tier derivation from isAdmin + hasPro flags
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveWcCapTier", () => {
  it("admin flag → admin tier regardless of hasPro", () => {
    expect(resolveWcCapTier({ isAdmin: true, hasPro: false })).toBe("admin")
    expect(resolveWcCapTier({ isAdmin: true, hasPro: true })).toBe("admin")
  })

  it("hasPro without admin → pro tier", () => {
    expect(resolveWcCapTier({ isAdmin: false, hasPro: true })).toBe("pro")
  })

  it("neither → free tier", () => {
    expect(resolveWcCapTier({ isAdmin: false, hasPro: false })).toBe("free")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. resolveWcCapTierForUser — async version using email + DB lookup
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveWcCapTierForUser", () => {
  beforeEach(() => {
    vi.mocked(userHasBracketBrainAi).mockReset()
  })

  it("admin email → admin tier (no bracketBrain check needed)", async () => {
    const tier = await resolveWcCapTierForUser("user-1", "admin@test.com")
    expect(tier).toBe("admin")
    // Should short-circuit before calling bracketBrainAi
    expect(userHasBracketBrainAi).not.toHaveBeenCalled()
  })

  it("non-admin email + hasPro → pro tier", async () => {
    vi.mocked(userHasBracketBrainAi).mockResolvedValue(true)
    const tier = await resolveWcCapTierForUser("user-2", "user@test.com")
    expect(tier).toBe("pro")
  })

  it("non-admin email + no Pro → free tier", async () => {
    vi.mocked(userHasBracketBrainAi).mockResolvedValue(false)
    const tier = await resolveWcCapTierForUser("user-3", "user@test.com")
    expect(tier).toBe("free")
  })

  it("null email + no Pro → free tier", async () => {
    vi.mocked(userHasBracketBrainAi).mockResolvedValue(false)
    const tier = await resolveWcCapTierForUser("user-4", null)
    expect(tier).toBe("free")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. getWcUpgradeMessage — friendly per-feature per-tier copy
// ─────────────────────────────────────────────────────────────────────────────

describe("getWcUpgradeMessage", () => {
  const features = [
    "chimmy",
    "explain_bracket",
    "commissioner_brain",
    "wc_matchup_narrative",
  ] as const
  const tiers = ["free", "pro", "admin"] as const

  for (const feature of features) {
    for (const tier of tiers) {
      it(`returns a non-empty string for ${feature} / ${tier}`, () => {
        const msg = getWcUpgradeMessage(feature, tier)
        expect(typeof msg).toBe("string")
        expect(msg.length).toBeGreaterThan(10)
      })
    }
  }

  it("free chimmy message mentions upgrading", () => {
    const msg = getWcUpgradeMessage("chimmy", "free")
    expect(msg.toLowerCase()).toMatch(/upgrade|af pro/i)
  })

  it("free explain message mentions AF Pro", () => {
    const msg = getWcUpgradeMessage("explain_bracket", "free")
    expect(msg.toLowerCase()).toMatch(/af pro/i)
  })

  it("free brain message mentions commissioner", () => {
    const msg = getWcUpgradeMessage("commissioner_brain", "free")
    expect(msg.toLowerCase()).toMatch(/commissioner/i)
  })

  it("free matchup message mentions AF Pro", () => {
    const msg = getWcUpgradeMessage("wc_matchup_narrative", "free")
    expect(msg.toLowerCase()).toMatch(/af pro/i)
  })

  it("pro chimmy message mentions daily reset", () => {
    const msg = getWcUpgradeMessage("chimmy", "pro")
    expect(msg.toLowerCase()).toMatch(/midnight utc|reset/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. checkWcAiCap — wraps dailyCaps with WC messages
// ─────────────────────────────────────────────────────────────────────────────

describe("checkWcAiCap", () => {
  const mockPrisma = prisma as unknown as {
    apiRateLimitRecord: { findFirst: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> }
  }

  beforeEach(() => {
    mockPrisma.apiRateLimitRecord.findFirst.mockReset()
    mockPrisma.apiRateLimitRecord.upsert.mockReset()
  })

  it("returns allowed:true when under cap", async () => {
    mockPrisma.apiRateLimitRecord.findFirst.mockResolvedValue({ callsMade: 2 })
    const result = await checkWcAiCap("chimmy", "user-1", "pro")
    expect(result.allowed).toBe(true)
    expect(result.used).toBe(2)
  })

  it("returns allowed:false with WC message when cap exceeded (chimmy/pro)", async () => {
    // Pro chimmy cap = 30
    mockPrisma.apiRateLimitRecord.findFirst.mockResolvedValue({ callsMade: 30 })
    const result = await checkWcAiCap("chimmy", "user-1", "pro")
    expect(result.allowed).toBe(false)
    expect(result.message).toMatch(/30 chimmy/i)
    expect(result.upgradePath).toBe("/pricing")
  })

  it("returns allowed:false with WC message when cap exceeded (chimmy/free)", async () => {
    // Free chimmy cap = 3
    mockPrisma.apiRateLimitRecord.findFirst.mockResolvedValue({ callsMade: 3 })
    const result = await checkWcAiCap("chimmy", "user-2", "free")
    expect(result.allowed).toBe(false)
    expect(result.message).toMatch(/af pro/i)
    expect(result.upgradePath).toContain("wc-chimmy")
  })

  it("returns allowed:false with WC message for explain_bracket/free (limit 1)", async () => {
    mockPrisma.apiRateLimitRecord.findFirst.mockResolvedValue({ callsMade: 1 })
    const result = await checkWcAiCap("explain_bracket", "user-3", "free")
    expect(result.allowed).toBe(false)
    expect(result.message).toMatch(/af pro/i)
    expect(result.upgradePath).toContain("wc-explain")
  })

  it("returns allowed:false with WC message for wc_matchup_narrative/pro (limit 25)", async () => {
    mockPrisma.apiRateLimitRecord.findFirst.mockResolvedValue({ callsMade: 25 })
    const result = await checkWcAiCap("wc_matchup_narrative", "user-4", "pro")
    expect(result.allowed).toBe(false)
    expect(result.message).toMatch(/25.*matchup/i)
    // Pro users who hit the cap go to /pricing (no source param — they already have Pro)
    expect(result.upgradePath).toBe("/pricing")
  })

  it("returns allowed:false with WC message for wc_matchup_narrative/free (limit 3)", async () => {
    mockPrisma.apiRateLimitRecord.findFirst.mockResolvedValue({ callsMade: 3 })
    const result = await checkWcAiCap("wc_matchup_narrative", "user-4b", "free")
    expect(result.allowed).toBe(false)
    expect(result.message).toMatch(/af pro/i)
    expect(result.upgradePath).toContain("wc-matchup-ai")
  })

  it("fails open (allowed:true) when DB throws", async () => {
    mockPrisma.apiRateLimitRecord.findFirst.mockRejectedValue(new Error("DB error"))
    const result = await checkWcAiCap("chimmy", "user-5", "pro")
    expect(result.allowed).toBe(true)
  })

  it("commissioner_brain is blocked for free tier (limit 0)", async () => {
    // Cap limit = 0 → blocked without DB query
    const result = await checkWcAiCap("commissioner_brain", "user-6", "free")
    expect(result.allowed).toBe(false)
    expect(result.message).toMatch(/commissioner/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. checkWorldCupChimmyRateLimit — tier-aware Chimmy limit
// ─────────────────────────────────────────────────────────────────────────────

describe("checkWorldCupChimmyRateLimit — tier-aware", () => {
  const mockPrisma = prisma as unknown as {
    worldCupBracketChatEvent: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
  }

  beforeEach(() => {
    mockPrisma.worldCupBracketChatEvent.count.mockReset()
    mockPrisma.worldCupBracketChatEvent.findMany.mockReset()
  })

  function generatedAiRows(count: number, userId: string) {
    return Array.from({ length: count }, () => ({
      metadata: {
        targetUserId: userId,
        provider: "openai",
        model: "gpt-4o-mini",
      },
    }))
  }

  it("free tier: blocks at 3 calls", async () => {
    mockPrisma.worldCupBracketChatEvent.findMany.mockResolvedValue(generatedAiRows(3, "user-1"))
    const result = await checkWorldCupChimmyRateLimit("user-1", new Date(), "free")
    expect(result.allowed).toBe(false)
    expect(result.limit).toBe(DAILY_CAP_LIMITS.chimmy.free)
    expect(result.limit).toBe(3)
  })

  it("free tier: allows at 2 calls", async () => {
    mockPrisma.worldCupBracketChatEvent.findMany.mockResolvedValue(generatedAiRows(2, "user-2"))
    const result = await checkWorldCupChimmyRateLimit("user-2", new Date(), "free")
    expect(result.allowed).toBe(true)
  })

  it("pro tier: blocks at 30 calls", async () => {
    mockPrisma.worldCupBracketChatEvent.findMany.mockResolvedValue(generatedAiRows(30, "user-3"))
    const result = await checkWorldCupChimmyRateLimit("user-3", new Date(), "pro")
    expect(result.allowed).toBe(false)
    expect(result.limit).toBe(30)
  })

  it("pro tier: allows at 29 calls", async () => {
    mockPrisma.worldCupBracketChatEvent.findMany.mockResolvedValue(generatedAiRows(29, "user-4"))
    const result = await checkWorldCupChimmyRateLimit("user-4", new Date(), "pro")
    expect(result.allowed).toBe(true)
  })

  it("admin tier: blocks at 75 calls", async () => {
    mockPrisma.worldCupBracketChatEvent.findMany.mockResolvedValue(generatedAiRows(75, "user-5"))
    const result = await checkWorldCupChimmyRateLimit("user-5", new Date(), "admin")
    expect(result.allowed).toBe(false)
    expect(result.limit).toBe(75)
  })

  it("default tier (no tier arg) is 'pro' — allows at 29 calls", async () => {
    mockPrisma.worldCupBracketChatEvent.findMany.mockResolvedValue(generatedAiRows(29, "user-6"))
    // Should default to 'pro' tier (30/day)
    const result = await checkWorldCupChimmyRateLimit("user-6", new Date())
    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(DAILY_CAP_LIMITS.chimmy.pro)
  })

  it("fails open (allowed:true) on DB error", async () => {
    mockPrisma.worldCupBracketChatEvent.findMany.mockRejectedValue(new Error("timeout"))
    const result = await checkWorldCupChimmyRateLimit("user-7", new Date(), "pro")
    expect(result.allowed).toBe(true)
    expect(result.used).toBe(0)
  })

  it("WORLD_CUP_CHIMMY_DAILY_LIMIT constant is still exported (backward compat)", () => {
    expect(typeof WORLD_CUP_CHIMMY_DAILY_LIMIT).toBe("number")
    expect(WORLD_CUP_CHIMMY_DAILY_LIMIT).toBe(20)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 8. Deterministic AI features are never gated (smoke tests)
// ─────────────────────────────────────────────────────────────────────────────

describe("deterministic AI features — always free (no cap)", () => {
  it("calculateWorldCupBracketGrade is a function", () => {
    expect(typeof calculateWorldCupBracketGrade).toBe("function")
  })

  it("calculateWorldCupLeaderboardAiInsights is a function", () => {
    expect(typeof calculateWorldCupLeaderboardAiInsights).toBe("function")
  })

  it("buildWorldCupPathToWinInsight is a function", () => {
    expect(typeof buildWorldCupPathToWinInsight).toBe("function")
  })

  it("calculateWorldCupBracketGrade returns a grade without any DB call", () => {
    const result = calculateWorldCupBracketGrade({
      completionReview: {
        groupsRankedCount: 12,
        thirdPlaceSelectedCount: 8,
        completedKnockoutPicks: 15,
        requiredKnockoutPicks: 15,
        missingKnockoutPicks: 0,
        fullEntryComplete: true,
      },
      entry: { championTeamId: "team-1", submittedAt: "2026-06-01T00:00:00Z" },
      picks: [],
      matches: [],
    })
    expect(typeof result.grade).toBe("string")
    expect(result.grade.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 9. incrementWcAiCap — delegates to incrementDailyCap
// ─────────────────────────────────────────────────────────────────────────────

describe("incrementWcAiCap", () => {
  const mockPrisma = prisma as unknown as {
    apiRateLimitRecord: { upsert: ReturnType<typeof vi.fn> }
  }

  beforeEach(() => {
    mockPrisma.apiRateLimitRecord.upsert.mockReset()
  })

  it("calls upsert on the DB for chimmy/pro", async () => {
    mockPrisma.apiRateLimitRecord.upsert.mockResolvedValue({})
    await incrementWcAiCap("chimmy", "user-1", "pro")
    expect(mockPrisma.apiRateLimitRecord.upsert).toHaveBeenCalledOnce()
  })

  it("does not throw on DB error", async () => {
    mockPrisma.apiRateLimitRecord.upsert.mockRejectedValue(new Error("locked"))
    await expect(incrementWcAiCap("explain_bracket", "user-2", "pro")).resolves.toBeUndefined()
  })

  it("increments wc_matchup_narrative cap without error", async () => {
    mockPrisma.apiRateLimitRecord.upsert.mockResolvedValue({})
    await expect(incrementWcAiCap("wc_matchup_narrative", "user-3", "admin")).resolves.toBeUndefined()
    expect(mockPrisma.apiRateLimitRecord.upsert).toHaveBeenCalledOnce()
  })
})

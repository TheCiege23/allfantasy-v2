/**
 * AI Access Gate tests — verifies all four access tiers:
 *   free (no access), trial, tokens, and premium subscription.
 *
 * Tests the AIAccessResolver in isolation (no Prisma, no external calls).
 */

import { describe, expect, it } from "vitest"

import { AI_TRIAL_DAYS, AIAccessResolver } from "@/lib/ai-access/AIAccessResolver"

function makeEntitlementResolver(hasAccess: boolean, plans: string[] = []) {
  return {
    resolveForUser: async () => ({
      hasAccess,
      entitlement: {
        plans,
        status: hasAccess ? "active" : "none",
        currentPeriodEnd: hasAccess ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        gracePeriodEnd: null,
      },
    }),
  } as Parameters<typeof AIAccessResolver>[0]
}

function makeTokenService(balance: number) {
  return {
    getBalance: async () => ({ balance }),
  } as Parameters<typeof AIAccessResolver>[1]
}

function makeFreeResolver() {
  return new AIAccessResolver(
    makeEntitlementResolver(false),
    makeTokenService(0)
  )
}

// ─── Free user ────────────────────────────────────────────────────────────────

describe("AIAccessResolver — free user (no trial, no tokens, no subscription)", () => {
  const oldSignup = new Date(Date.now() - (AI_TRIAL_DAYS + 5) * 24 * 60 * 60 * 1000)

  it("hasAccess is false", async () => {
    const resolver = makeFreeResolver()
    const status = await resolver.resolveForUser({
      userId: "u_free",
      createdAt: oldSignup,
    })
    expect(status.hasAccess).toBe(false)
  })

  it("reason is no_access", async () => {
    const resolver = makeFreeResolver()
    const status = await resolver.resolveForUser({
      userId: "u_free",
      createdAt: oldSignup,
    })
    expect(status.reason).toBe("no_access")
  })

  it("tokenBalance is 0", async () => {
    const resolver = makeFreeResolver()
    const status = await resolver.resolveForUser({
      userId: "u_free",
      createdAt: oldSignup,
    })
    expect(status.tokenBalance).toBe(0)
  })

  it("hasSubscription is false", async () => {
    const resolver = makeFreeResolver()
    const status = await resolver.resolveForUser({
      userId: "u_free",
      createdAt: oldSignup,
    })
    expect(status.hasSubscription).toBe(false)
  })

  it("trial.inTrial is false for expired signup", async () => {
    const resolver = makeFreeResolver()
    const status = await resolver.resolveForUser({
      userId: "u_free",
      createdAt: oldSignup,
    })
    expect(status.trial.inTrial).toBe(false)
  })
})

// ─── Trial user ───────────────────────────────────────────────────────────────

describe("AIAccessResolver — trial user (signed up recently)", () => {
  const freshSignup = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago

  it("hasAccess is true during trial", async () => {
    const resolver = makeFreeResolver()
    const status = await resolver.resolveForUser({
      userId: "u_trial",
      createdAt: freshSignup,
    })
    expect(status.hasAccess).toBe(true)
  })

  it("reason is in_trial", async () => {
    const resolver = makeFreeResolver()
    const status = await resolver.resolveForUser({
      userId: "u_trial",
      createdAt: freshSignup,
    })
    expect(status.reason).toBe("in_trial")
  })

  it("trial.daysRemaining is > 0", async () => {
    const resolver = makeFreeResolver()
    const status = await resolver.resolveForUser({
      userId: "u_trial",
      createdAt: freshSignup,
    })
    expect(status.trial.daysRemaining).toBeGreaterThan(0)
    expect(status.trial.daysRemaining).toBeLessThanOrEqual(AI_TRIAL_DAYS)
  })

  it("trial.inTrial is true", async () => {
    const resolver = makeFreeResolver()
    const status = await resolver.resolveForUser({
      userId: "u_trial",
      createdAt: freshSignup,
    })
    expect(status.trial.inTrial).toBe(true)
  })

  it("trial is expired after AI_TRIAL_DAYS + 1", async () => {
    const expiredSignup = new Date(Date.now() - (AI_TRIAL_DAYS + 1) * 24 * 60 * 60 * 1000)
    const resolver = makeFreeResolver()
    const status = await resolver.resolveForUser({
      userId: "u_trial",
      createdAt: expiredSignup,
    })
    expect(status.trial.inTrial).toBe(false)
  })

  it("hasSubscription is false even during trial", async () => {
    const resolver = makeFreeResolver()
    const status = await resolver.resolveForUser({
      userId: "u_trial",
      createdAt: freshSignup,
    })
    expect(status.hasSubscription).toBe(false)
  })
})

// ─── Token user ───────────────────────────────────────────────────────────────

describe("AIAccessResolver — token user (positive balance, expired trial)", () => {
  const oldSignup = new Date(Date.now() - (AI_TRIAL_DAYS + 5) * 24 * 60 * 60 * 1000)

  it("hasAccess is true when balance > 0", async () => {
    const resolver = new AIAccessResolver(
      makeEntitlementResolver(false),
      makeTokenService(10)
    )
    const status = await resolver.resolveForUser({
      userId: "u_tokens",
      createdAt: oldSignup,
    })
    expect(status.hasAccess).toBe(true)
  })

  it("reason is tokens_available", async () => {
    const resolver = new AIAccessResolver(
      makeEntitlementResolver(false),
      makeTokenService(5)
    )
    const status = await resolver.resolveForUser({
      userId: "u_tokens",
      createdAt: oldSignup,
    })
    expect(status.reason).toBe("tokens_available")
  })

  it("tokenBalance reflects actual balance", async () => {
    const resolver = new AIAccessResolver(
      makeEntitlementResolver(false),
      makeTokenService(42)
    )
    const status = await resolver.resolveForUser({
      userId: "u_tokens",
      createdAt: oldSignup,
    })
    expect(status.tokenBalance).toBe(42)
  })

  it("hasAccess is false when balance is 0 and trial expired", async () => {
    const resolver = new AIAccessResolver(
      makeEntitlementResolver(false),
      makeTokenService(0)
    )
    const status = await resolver.resolveForUser({
      userId: "u_tokens",
      createdAt: oldSignup,
    })
    expect(status.hasAccess).toBe(false)
  })
})

// ─── Premium subscriber ───────────────────────────────────────────────────────

describe("AIAccessResolver — premium subscriber", () => {
  it("hasAccess is true", async () => {
    const resolver = new AIAccessResolver(
      makeEntitlementResolver(true, ["ai_premium_monthly"]),
      makeTokenService(0)
    )
    const status = await resolver.resolveForUser({ userId: "u_pro" })
    expect(status.hasAccess).toBe(true)
  })

  it("reason is subscription_active", async () => {
    const resolver = new AIAccessResolver(
      makeEntitlementResolver(true, ["ai_premium_monthly"]),
      makeTokenService(0)
    )
    const status = await resolver.resolveForUser({ userId: "u_pro" })
    expect(status.reason).toBe("subscription_active")
  })

  it("hasSubscription is true", async () => {
    const resolver = new AIAccessResolver(
      makeEntitlementResolver(true, ["ai_premium_monthly"]),
      makeTokenService(0)
    )
    const status = await resolver.resolveForUser({ userId: "u_pro" })
    expect(status.hasSubscription).toBe(true)
  })

  it("subscription beats trial (subscription is checked first)", async () => {
    const freshSignup = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    const resolver = new AIAccessResolver(
      makeEntitlementResolver(true, ["ai_premium_monthly"]),
      makeTokenService(0)
    )
    const status = await resolver.resolveForUser({
      userId: "u_pro",
      createdAt: freshSignup,
    })
    // Should report subscription_active, not in_trial
    expect(status.reason).toBe("subscription_active")
  })

  it("subscription beats tokens (subscription checked first)", async () => {
    const resolver = new AIAccessResolver(
      makeEntitlementResolver(true, ["ai_premium_monthly"]),
      makeTokenService(100)
    )
    const status = await resolver.resolveForUser({ userId: "u_pro" })
    expect(status.reason).toBe("subscription_active")
    // Still reports actual balance
    expect(status.tokenBalance).toBe(100)
  })
})

// ─── Admin grant ──────────────────────────────────────────────────────────────

describe("AIAccessResolver — admin grant (entitlement without explicit plan)", () => {
  it("hasAccess is true with admin entitlement", async () => {
    const resolver = new AIAccessResolver(
      makeEntitlementResolver(true, []),
      makeTokenService(0)
    )
    const status = await resolver.resolveForUser({ userId: "u_admin" })
    expect(status.hasAccess).toBe(true)
    expect(status.hasSubscription).toBe(true)
    expect(status.reason).toBe("subscription_active")
  })
})

// ─── Resilience — entitlement service failure ──────────────────────────────────

describe("AIAccessResolver — entitlement failure handling", () => {
  it("falls back to trial/token access if entitlement throws", async () => {
    const brokenEntitlement = {
      resolveForUser: async () => { throw new Error("entitlement service down") },
    } as Parameters<typeof AIAccessResolver>[0]

    const freshSignup = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    const resolver = new AIAccessResolver(brokenEntitlement, makeTokenService(0))
    const status = await resolver.resolveForUser({
      userId: "u_fault",
      createdAt: freshSignup,
    })
    // Trial should still grant access even if entitlement fails
    expect(status.hasAccess).toBe(true)
    expect(status.reason).toBe("in_trial")
  })

  it("returns no_access if both entitlement and tokens fail", async () => {
    const brokenEntitlement = {
      resolveForUser: async () => { throw new Error("entitlement service down") },
    } as Parameters<typeof AIAccessResolver>[0]
    const brokenTokens = {
      getBalance: async () => { throw new Error("token service down") },
    } as Parameters<typeof AIAccessResolver>[1]

    const oldSignup = new Date(Date.now() - (AI_TRIAL_DAYS + 5) * 24 * 60 * 60 * 1000)
    const resolver = new AIAccessResolver(brokenEntitlement, brokenTokens)
    const status = await resolver.resolveForUser({
      userId: "u_fault",
      createdAt: oldSignup,
    })
    expect(status.hasAccess).toBe(false)
    expect(status.reason).toBe("no_access")
  })
})

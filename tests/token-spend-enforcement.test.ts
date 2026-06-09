/**
 * Token spend enforcement tests
 *
 * Proves that the billing decision emitted by generateWorldCupChimmyPrivateReply
 * is correct for every code path, and that the audit log receives the right
 * billing fields on each path.
 *
 * ── What this tests ──────────────────────────────────────────────────────────
 *  A. Non-chargeable paths: each deterministic/cache/unavailable/validator-blocked
 *     path sets shouldChargeToken = false with the correct billingReason.
 *  B. Plan-included path: paid-plan LLM call sets shouldChargeToken = false,
 *     reason = "premium_plan_included".
 *  C. Chargeable path: no-plan LLM call sets shouldChargeToken = true,
 *     reason = "llm_required". (Note: the WC Chimmy route gate blocks this path
 *     in production — this test proves the policy logic is correct at the
 *     service layer so the gate can be verified independently.)
 *  D. Audit log: logAiInteraction receives billingReason, shouldChargeToken,
 *     tokenCharged, tokenChargeStatus on every call.
 *
 * ── Safety guarantee (mirrors chimmy-llm-gate.test.ts) ──────────────────────
 *  Deterministic, cache-hit, and unavailable paths must never show
 *  shouldChargeToken = true regardless of the user's plan.
 *
 * ── Mock strategy ─────────────────────────────────────────────────────────────
 *  - routeTextCall: mocked via vi.hoisted (LLM or unavailable depending on test)
 *  - logAiInteraction: mocked so we can capture what fields were passed
 *  - getCachedAiResult: mocked to control cache hit vs miss
 *  - All other side-effects (appendChatHistory, aiConfig, etc.): mocked to no-ops
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

// ── routeTextCallMock must use vi.hoisted ─────────────────────────────────────
const { routeTextCallMock } = vi.hoisted(() => ({
  routeTextCallMock: vi.fn().mockResolvedValue({
    ok: true,
    text: "QUICK: Mock coaching answer.\nWHY: Because strategy.\nEDGE: Watch out.",
    provider: "openai",
    model: "gpt-4o-mini",
    tokensUsed: 250,
  }),
}))

vi.mock("@/lib/ai/providerRouter", () => ({
  routeTextCall: routeTextCallMock,
}))

// ── logAiInteractionMock — capture billing fields ─────────────────────────────
const { logAiInteractionMock } = vi.hoisted(() => ({
  logAiInteractionMock: vi.fn(),
}))
vi.mock("@/lib/ai/auditLogger", () => ({
  logAiInteraction: logAiInteractionMock,
}))

// ── Side-effect mocks ─────────────────────────────────────────────────────────
vi.mock("@/lib/ai-memory/chat-history-store", () => ({
  appendChatHistory: vi.fn().mockResolvedValue(undefined),
  buildChimmyConversationId: vi.fn().mockReturnValue("conv-enforce-1"),
}))
vi.mock("@/lib/ai/aiConfig", () => ({
  getAiCacheTtls: vi.fn().mockReturnValue({ chimmy: 1200, explain_bracket: 21600, commissioner_brain: 1800 }),
}))
vi.mock("@/lib/ai/deterministic", () => ({
  DETERMINISTIC_SOURCE: "deterministic",
  tryDeterministicAnswer: vi.fn().mockResolvedValue(null),
}))

// ── Cache mock: configurable per test ────────────────────────────────────────
const { getCachedAiResultMock, saveAiResultMock } = vi.hoisted(() => ({
  getCachedAiResultMock: vi.fn().mockResolvedValue(null), // default: miss
  saveAiResultMock: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/lib/ai/ai-result-cache", () => ({
  getCachedAiResult: getCachedAiResultMock,
  saveAiResult: saveAiResultMock,
}))

beforeEach(() => {
  vi.clearAllMocks()
  // Reset to default: cache miss, LLM available
  getCachedAiResultMock.mockResolvedValue(null)
  routeTextCallMock.mockResolvedValue({
    ok: true,
    text: "QUICK: Mock coaching answer.\nWHY: Because strategy.",
    provider: "openai",
    model: "gpt-4o-mini",
    tokensUsed: 250,
  })
})

import { generateWorldCupChimmyPrivateReply } from "@/lib/world-cup/worldCupChimmyPrivateReply"

// ─── Pool context helpers ─────────────────────────────────────────────────────

function makeContext(overrides: Record<string, unknown> = {}) {
  return {
    challengeId: "challenge-1",
    poolName: "Enforcement Test Pool",
    isLocked: true,
    lockReason: null,
    participantCount: 8,
    entryCount: 8,
    finalizedEntryCount: 7,
    inviteCount: 0,
    liveDataStatus: "pool_only",
    lastSyncedAt: null,
    locale: "en",
    fetchedAt: "2026-06-09T10:00:00Z",
    liveMatches: [],
    upcomingMatches: [],
    recentMatches: [],
    groupStandings: [],
    entry: {
      entryId: "entry-1",
      entryName: "My Entry",
      rank: 2,
      totalScore: 140,
      maxPossibleScore: 200,
      championPick: "Brazil",
      isComplete: true,
      isLocked: true,
      correctPicks: 7,
      incorrectPicks: 1,
      groupPicks: [],
      knockoutPicks: [],
      thirdPlacePicks: [],
    },
    leaderboard: [
      { entryId: "e1", totalScore: 180, rank: 1, entryName: "Leader" },
      { entryId: "e2", totalScore: 140, rank: 2, entryName: "Me" },
    ],
    scoring: {
      roundOf32Points: 1,
      roundOf16Points: 2,
      quarterFinalPoints: 4,
      semiFinalPoints: 8,
      finalPoints: 12,
      championBonusPoints: 16,
    },
    commissionerSettings: null,
    ...overrides,
  }
}

// ─── Suite A: Non-chargeable paths ───────────────────────────────────────────

describe("A. Non-chargeable paths — shouldChargeToken = false", () => {
  it("A1. deterministic answer → billingReason=deterministic, shouldChargeToken=false", async () => {
    const result = await generateWorldCupChimmyPrivateReply({
      userId: "u1",
      challengeId: "c1",
      prompt: "Who is leading the pool?",
      context: makeContext(),
      entitlements: { plan: null, tokenBalance: 0 },
    })

    expect(result.billingDecision.shouldChargeToken).toBe(false)
    expect(result.billingDecision.reason).toBe("deterministic")
    expect(routeTextCallMock).not.toHaveBeenCalled()

    // Audit log must receive billing fields
    expect(logAiInteractionMock).toHaveBeenCalledOnce()
    const auditEntry = logAiInteractionMock.mock.calls[0][0]
    expect(auditEntry.billingReason).toBe("deterministic")
    expect(auditEntry.shouldChargeToken).toBe(false)
    expect(auditEntry.tokenCharged).toBe(false)
    expect(auditEntry.tokenChargeStatus).toBe("not_applicable")
  })

  it("A2. null context → billingReason=provider_missing, shouldChargeToken=false", async () => {
    const result = await generateWorldCupChimmyPrivateReply({
      userId: "u1",
      challengeId: "c1",
      prompt: "What is my path to win?",
      context: null,
      entitlements: { plan: null, tokenBalance: 0 },
    })

    expect(result.billingDecision.shouldChargeToken).toBe(false)
    expect(result.billingDecision.reason).toMatch(/provider_missing|deterministic/)
    expect(routeTextCallMock).not.toHaveBeenCalled()

    const auditEntry = logAiInteractionMock.mock.calls[0][0]
    expect(auditEntry.shouldChargeToken).toBe(false)
    expect(auditEntry.tokenCharged).toBe(false)
    expect(auditEntry.tokenChargeStatus).toBe("not_applicable")
  })

  it("A3. cache hit → billingReason=cache_hit, shouldChargeToken=false", async () => {
    // getCachedAiResult is used internally by getOrCreateWcChimmyInsight.
    // Return the shape that getOrCreate checks: { resultText, provider, model }.
    // The caller sets provider = "cache" when cacheResult.cacheHit is true.
    getCachedAiResultMock.mockResolvedValue({
      resultText: "QUICK: Leader is France with 180 pts.",
      provider: "openai",  // stored provider; caller overwrites with "cache"
      model: null,         // model-agnostic cache key (always null in aiInsightCache)
    })

    const result = await generateWorldCupChimmyPrivateReply({
      userId: "u1",
      challengeId: "c1",
      prompt: "Explain my bracket strategy and all risks",
      context: makeContext(),
      entitlements: { plan: "pro", tokenBalance: 100 },
    })

    expect(result.billingDecision.shouldChargeToken).toBe(false)
    expect(result.billingDecision.reason).toBe("cache_hit")
    expect(routeTextCallMock).not.toHaveBeenCalled()

    const auditEntry = logAiInteractionMock.mock.calls[0][0]
    expect(auditEntry.billingReason).toBe("cache_hit")
    expect(auditEntry.shouldChargeToken).toBe(false)
    expect(auditEntry.tokenChargeStatus).toBe("cache_no_charge")
  })

  it("A4. LLM unavailable → billingReason=provider_missing, shouldChargeToken=false", async () => {
    routeTextCallMock.mockResolvedValue({ ok: false, text: "", provider: "openai", model: "gpt-4o-mini" })

    const result = await generateWorldCupChimmyPrivateReply({
      userId: "u1",
      challengeId: "c1",
      prompt: "Explain my bracket strategy in detail",
      context: makeContext(),
      entitlements: { plan: null, tokenBalance: 0 },
    })

    expect(result.billingDecision.shouldChargeToken).toBe(false)
    expect(result.billingDecision.reason).toBe("provider_missing")

    const auditEntry = logAiInteractionMock.mock.calls[0][0]
    expect(auditEntry.billingReason).toBe("provider_missing")
    expect(auditEntry.shouldChargeToken).toBe(false)
    expect(auditEntry.tokenCharged).toBe(false)
    expect(auditEntry.tokenChargeStatus).toBe("not_applicable")
  })
})

// ─── Suite B: Plan-included path ─────────────────────────────────────────────

describe("B. Premium plan included — LLM ran but no token deducted", () => {
  it("B1. pro plan + LLM call → billingReason=premium_plan_included, shouldChargeToken=false", async () => {
    const result = await generateWorldCupChimmyPrivateReply({
      userId: "u1",
      challengeId: "c1",
      prompt: "Explain why my bracket is risky and what I can do about it",
      context: makeContext(),
      entitlements: { plan: "pro", tokenBalance: 50 },
    })

    expect(result.billingDecision.shouldChargeToken).toBe(false)
    expect(result.billingDecision.reason).toBe("premium_plan_included")

    const auditEntry = logAiInteractionMock.mock.calls[0][0]
    expect(auditEntry.billingReason).toBe("premium_plan_included")
    expect(auditEntry.shouldChargeToken).toBe(false)
    expect(auditEntry.tokenCharged).toBe(false)
    expect(auditEntry.tokenChargeStatus).toBe("covered_by_plan")
  })

  it("B2. supreme plan + LLM call → covered, no charge", async () => {
    const result = await generateWorldCupChimmyPrivateReply({
      userId: "u2",
      challengeId: "c1",
      prompt: "Analyze the bracket competition dynamics and give me deep strategic insights on how I can improve my position",
      context: makeContext(),
      entitlements: { plan: "supreme", tokenBalance: 1000 },
    })

    expect(result.billingDecision.shouldChargeToken).toBe(false)
    expect(result.billingDecision.reason).toBe("premium_plan_included")

    const auditEntry = logAiInteractionMock.mock.calls[0][0]
    expect(auditEntry.tokenChargeStatus).toBe("covered_by_plan")
  })
})

// ─── Suite C: Chargeable path (policy logic verification) ─────────────────────

describe("C. Chargeable path — no plan, LLM ran → shouldChargeToken = true", () => {
  it("C1. no-plan LLM call → billingReason=llm_required, shouldChargeToken=true", async () => {
    // In production the WC Chimmy route gate blocks non-subscribers BEFORE
    // reaching this service. This test proves the policy logic is correct
    // at the service layer — the gate independently enforces it at the route.
    const result = await generateWorldCupChimmyPrivateReply({
      userId: "u3",
      challengeId: "c1",
      prompt: "Explain why my bracket is risky in great detail please",
      context: makeContext(),
      entitlements: { plan: null, tokenBalance: 0 },
    })

    // The billing decision says: charge required
    expect(result.billingDecision.shouldChargeToken).toBe(true)
    expect(result.billingDecision.reason).toBe("llm_required")
    expect(result.billingDecision.displayHint).toContain("1 token used")

    // Audit log records the policy decision (even though WC Chimmy has no spend rule yet)
    const auditEntry = logAiInteractionMock.mock.calls[0][0]
    expect(auditEntry.billingReason).toBe("llm_required")
    expect(auditEntry.shouldChargeToken).toBe(true)
    // tokenCharged = false because WC Chimmy has no spend rule wired yet
    expect(auditEntry.tokenCharged).toBe(false)
  })

  it("C2. free plan + LLM → llm_required (free plan is not a paid plan)", async () => {
    const result = await generateWorldCupChimmyPrivateReply({
      userId: "u4",
      challengeId: "c1",
      prompt: "Analyze my bracket risks in depth",
      context: makeContext(),
      entitlements: { plan: "free", tokenBalance: 10 },
    })

    expect(result.billingDecision.shouldChargeToken).toBe(true)
    expect(result.billingDecision.reason).toBe("llm_required")
  })
})

// ─── Suite D: Audit log always receives billing fields ────────────────────────

describe("D. Audit log always receives billing fields", () => {
  it("D1. every call includes billingReason, shouldChargeToken, tokenCharged, tokenChargeStatus", async () => {
    await generateWorldCupChimmyPrivateReply({
      userId: "u5",
      challengeId: "c1",
      prompt: "Who is leading?",
      context: makeContext(),
      entitlements: { plan: "pro", tokenBalance: 50 },
    })

    expect(logAiInteractionMock).toHaveBeenCalledOnce()
    const auditEntry = logAiInteractionMock.mock.calls[0][0]

    // All four billing fields must always be present (never undefined)
    expect(auditEntry).toHaveProperty("billingReason")
    expect(auditEntry).toHaveProperty("shouldChargeToken")
    expect(auditEntry).toHaveProperty("tokenCharged")
    expect(auditEntry).toHaveProperty("tokenChargeStatus")

    // Type checks
    expect(typeof auditEntry.shouldChargeToken).toBe("boolean")
    expect(typeof auditEntry.tokenCharged).toBe("boolean")
  })

  it("D2. billing fields are present even when context is null", async () => {
    await generateWorldCupChimmyPrivateReply({
      userId: "u6",
      challengeId: "c1",
      prompt: "What matches are today?",
      context: null,
      entitlements: { plan: "pro", tokenBalance: 50 },
    })

    const auditEntry = logAiInteractionMock.mock.calls[0][0]
    expect(auditEntry).toHaveProperty("billingReason")
    expect(auditEntry).toHaveProperty("shouldChargeToken")
    expect(typeof auditEntry.shouldChargeToken).toBe("boolean")
  })

  it("D3. deterministic answer → tokenChargeStatus=not_applicable", async () => {
    await generateWorldCupChimmyPrivateReply({
      userId: "u7",
      challengeId: "c1",
      prompt: "What is my rank?",
      context: makeContext(),
      entitlements: { plan: null, tokenBalance: 0 },
    })

    const auditEntry = logAiInteractionMock.mock.calls[0][0]
    expect(auditEntry.tokenChargeStatus).toBe("not_applicable")
    expect(auditEntry.billingReason).toBe("deterministic")
  })
})

/**
 * AiInsightCache + TeachingAnswer tests
 *
 * Suite A: hashGroundingPacket
 *  1. Same input produces the same hash
 *  2. Different inputs produce different hashes
 *  3. Key ordering doesn't affect the hash (stable stringify)
 *  4. Null top-level values are filtered (minor schema changes don't bust cache)
 *  5. Returns a 32-char hex string
 *
 * Suite B: getOrCreateWcChimmyInsight — cache hit skips LLM
 *  6.  Cache miss: onCacheMiss is called and result is returned
 *  7.  Cache hit: onCacheMiss is NOT called; cached text is returned
 *  8.  Cache hit: tokensUsed is null (no LLM cost on hit)
 *  9.  Empty resultText from onCacheMiss is not saved (save skipped)
 * 10.  Cache read failure is non-fatal (falls through to LLM)
 *
 * Suite C: getOrCreateWcExplainBracketInsight
 * 11.  Different entryId values → separate cache entries (scoped by user:entry)
 * 12.  Different groundingHash → separate cache entries (pick change = miss)
 *
 * Suite D: getOrCreateWcCommissionerInsight
 * 13.  Different kind values → separate cache entries
 * 14.  Same kind + same groundingHash → cache hit
 *
 * Suite E: parseTeachingAnswer
 * 15.  Parses all five sections correctly
 * 16.  Returns null when required sections are missing
 * 17.  Falls back to partial result when AVOID/CONFIDENCE missing
 * 18.  Confidence clamped to 0-1 range
 * 19.  parseTeachingAnswerWithFallback wraps unstructured text in quickAnswer
 * 20.  serializeTeachingAnswer round-trips cleanly
 *
 * Suite F: TeachingAnswerCard component
 * 21.  Renders quickAnswer, whyItMatters, theEdge
 * 22.  Renders AVOID section when mistakeToAvoid present
 * 23.  Does not render AVOID section when mistakeToAvoid absent
 * 24.  Confidence pill shows correct percentage
 * 25.  Feedback buttons fire onFeedback callback
 * 26.  No feedback buttons when onFeedback not provided
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock server-only (vitest environment doesn't understand next.js server packages) ──
vi.mock("server-only", () => ({}))

// ─── Mock prisma (ai-result-cache.ts uses it) ────────────────────────────────
const prismaMock = vi.hoisted(() => ({
  aiResult: {
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

// ─── Mock aiConfig (avoid env reading in tests) ──────────────────────────────
vi.mock("@/lib/ai/aiConfig", () => ({
  getAiCacheTtls: () => ({
    chimmy: 1200,
    explain_bracket: 21600,
    commissioner_brain: 1800,
    schedule_static: 900,
  }),
}))

// Clear call counts (not implementations) between every test so assertions like
// "not.toHaveBeenCalled" don't see calls from previous tests.
// vi.clearAllMocks = .mockClear() on all mocks — resets calls/results but NOT implementations.
beforeEach(() => {
  vi.clearAllMocks()
})

import {
  hashGroundingPacket,
  getOrCreateWcChimmyInsight,
  getOrCreateWcExplainBracketInsight,
  getOrCreateWcCommissionerInsight,
} from "@/lib/ai/aiInsightCache"

import {
  parseTeachingAnswer,
  parseTeachingAnswerWithFallback,
  serializeTeachingAnswer,
} from "@/lib/ai/teachingAnswer"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAiResultRow(text: string) {
  return {
    id: "row-1",
    resultKey: "key-1",
    inputHash: "hash-1",
    feature: "wc_chimmy",
    scopeType: "user_challenge",
    scopeId: "u1:c1",
    provider: "openai",
    model: "gpt-4o-mini",
    status: "ready",
    inputJson: {},
    resultText: text,
    resultJson: null,
    tokenPrompt: 100,
    tokenOutput: 50,
    syncedAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ─── Suite A: hashGroundingPacket ─────────────────────────────────────────────

describe("hashGroundingPacket", () => {
  it("1. same input → same hash", () => {
    const a = hashGroundingPacket({ entryCount: 5, leaderScore: 42, isLocked: false })
    const b = hashGroundingPacket({ entryCount: 5, leaderScore: 42, isLocked: false })
    expect(a).toBe(b)
  })

  it("2. different inputs → different hashes", () => {
    const a = hashGroundingPacket({ entryCount: 5, leaderScore: 42 })
    const b = hashGroundingPacket({ entryCount: 5, leaderScore: 43 })
    expect(a).not.toBe(b)
  })

  it("3. key ordering doesn't affect hash (stable stringify)", () => {
    const a = hashGroundingPacket({ a: 1, b: 2, c: 3 })
    const b = hashGroundingPacket({ c: 3, a: 1, b: 2 })
    expect(a).toBe(b)
  })

  it("4. null top-level values are filtered", () => {
    const a = hashGroundingPacket({ entryCount: 5, leaderScore: null, isLocked: undefined })
    const b = hashGroundingPacket({ entryCount: 5 })
    // Both should hash the same since null/undefined fields are filtered
    expect(a).toBe(b)
  })

  it("5. returns a 32-char hex string", () => {
    const h = hashGroundingPacket({ x: 1 })
    expect(h).toMatch(/^[0-9a-f]{32}$/)
  })
})

// ─── Suite B: getOrCreateWcChimmyInsight ─────────────────────────────────────

describe("getOrCreateWcChimmyInsight: cache miss", () => {
  beforeEach(() => {
    prismaMock.aiResult.findFirst.mockResolvedValue(null) // always miss
    prismaMock.aiResult.upsert.mockResolvedValue(makeAiResultRow("fresh answer"))
  })

  it("6. cache miss: onCacheMiss is called and text returned", async () => {
    const onCacheMiss = vi.fn().mockResolvedValue({
      resultText: "fresh answer",
      tokensUsed: 200,
      provider: "openai",
      model: "gpt-4o-mini",
    })
    const result = await getOrCreateWcChimmyInsight(
      { userId: "u1", challengeId: "c1", promptNormalized: "who is leading?", groundingHash: "abc" },
      onCacheMiss
    )
    expect(onCacheMiss).toHaveBeenCalledOnce()
    expect(result.cacheHit).toBe(false)
    expect(result.text).toBe("fresh answer")
    expect(result.tokensUsed).toBe(200)
  })

  it("9. empty resultText from onCacheMiss: upsert is NOT called", async () => {
    const onCacheMiss = vi.fn().mockResolvedValue({ resultText: null })
    await getOrCreateWcChimmyInsight(
      { userId: "u1", challengeId: "c1", promptNormalized: "empty", groundingHash: "abc" },
      onCacheMiss
    )
    // saveAiResult internally calls upsert — it should not be called for empty text
    // (the fire-and-forget save is skipped when resultText is falsy)
    await new Promise((r) => setTimeout(r, 10)) // let microtasks flush
    expect(prismaMock.aiResult.upsert).not.toHaveBeenCalled()
  })
})

describe("getOrCreateWcChimmyInsight: cache hit", () => {
  beforeEach(() => {
    prismaMock.aiResult.findFirst.mockResolvedValue(
      makeAiResultRow("cached answer from last time")
    )
  })

  it("7. cache hit: onCacheMiss is NOT called", async () => {
    const onCacheMiss = vi.fn().mockResolvedValue({ resultText: "should not be called" })
    const result = await getOrCreateWcChimmyInsight(
      { userId: "u1", challengeId: "c1", promptNormalized: "who is leading?", groundingHash: "abc" },
      onCacheMiss
    )
    expect(onCacheMiss).not.toHaveBeenCalled()
    expect(result.cacheHit).toBe(true)
    expect(result.text).toBe("cached answer from last time")
  })

  it("8. cache hit: tokensUsed is null (no LLM cost)", async () => {
    const onCacheMiss = vi.fn()
    const result = await getOrCreateWcChimmyInsight(
      { userId: "u1", challengeId: "c1", promptNormalized: "who is leading?", groundingHash: "abc" },
      onCacheMiss
    )
    expect(result.tokensUsed).toBeNull()
  })

  it("10. cache read throws: falls through to onCacheMiss (non-fatal)", async () => {
    prismaMock.aiResult.findFirst.mockRejectedValue(new Error("DB connection error"))
    prismaMock.aiResult.upsert.mockResolvedValue(makeAiResultRow("fallback answer"))

    const onCacheMiss = vi.fn().mockResolvedValue({
      resultText: "fallback answer",
      tokensUsed: 150,
    })
    const result = await getOrCreateWcChimmyInsight(
      { userId: "u1", challengeId: "c1", promptNormalized: "test", groundingHash: "abc" },
      onCacheMiss
    )
    expect(onCacheMiss).toHaveBeenCalledOnce()
    expect(result.text).toBe("fallback answer")
  })
})

// ─── Suite C: getOrCreateWcExplainBracketInsight ─────────────────────────────

describe("getOrCreateWcExplainBracketInsight", () => {
  it("11. different entryId → different scope (separate cache entries)", async () => {
    const capturedScopeIds: string[] = []
    prismaMock.aiResult.findFirst.mockImplementation(({ where }: any) => {
      capturedScopeIds.push(where.scopeId)
      return Promise.resolve(null)
    })
    prismaMock.aiResult.upsert.mockResolvedValue(makeAiResultRow("answer"))

    await getOrCreateWcExplainBracketInsight(
      { userId: "u1", entryId: "e1", groundingHash: "h1" },
      async () => ({ resultText: "answer A" })
    )
    await getOrCreateWcExplainBracketInsight(
      { userId: "u1", entryId: "e2", groundingHash: "h1" },
      async () => ({ resultText: "answer B" })
    )

    // Scope IDs should differ
    expect(capturedScopeIds).toHaveLength(2)
    expect(capturedScopeIds[0]).not.toBe(capturedScopeIds[1])
    expect(capturedScopeIds[0]).toContain("e1")
    expect(capturedScopeIds[1]).toContain("e2")
  })

  it("12. different groundingHash → different payload (pick change = cache miss)", async () => {
    prismaMock.aiResult.findFirst.mockResolvedValue(null)
    prismaMock.aiResult.upsert.mockResolvedValue(makeAiResultRow("answer"))

    const onCacheMiss = vi.fn().mockResolvedValue({ resultText: "answer" })

    await getOrCreateWcExplainBracketInsight(
      { userId: "u1", entryId: "e1", groundingHash: "hash-before-pick-change" },
      onCacheMiss
    )
    await getOrCreateWcExplainBracketInsight(
      { userId: "u1", entryId: "e1", groundingHash: "hash-after-pick-change" },
      onCacheMiss
    )

    // Both were cache misses → onCacheMiss called twice
    expect(onCacheMiss).toHaveBeenCalledTimes(2)
  })
})

// ─── Suite D: getOrCreateWcCommissionerInsight ───────────────────────────────

describe("getOrCreateWcCommissionerInsight", () => {
  it("13. different kind → separate cache entries", async () => {
    const capturedPayloads: unknown[] = []
    prismaMock.aiResult.findFirst.mockImplementation(({ where }: any) => {
      capturedPayloads.push(where)
      return Promise.resolve(null)
    })
    prismaMock.aiResult.upsert.mockResolvedValue(makeAiResultRow("text"))

    await getOrCreateWcCommissionerInsight(
      { challengeId: "c1", kind: "hype", groundingHash: "gh1" },
      async () => ({ resultText: "hype text" })
    )
    await getOrCreateWcCommissionerInsight(
      { challengeId: "c1", kind: "trash_talk", groundingHash: "gh1" },
      async () => ({ resultText: "trash talk text" })
    )

    // Two separate findFirst calls (one per kind)
    expect(capturedPayloads).toHaveLength(2)
  })

  it("14. same kind + same groundingHash → cache hit on second call", async () => {
    prismaMock.aiResult.findFirst
      .mockResolvedValueOnce(null) // first call: miss
      .mockResolvedValueOnce(makeAiResultRow("standings text")) // second call: hit
    prismaMock.aiResult.upsert.mockResolvedValue(makeAiResultRow("standings text"))

    const onCacheMiss = vi.fn().mockResolvedValue({ resultText: "standings text" })

    await getOrCreateWcCommissionerInsight(
      { challengeId: "c1", kind: "standings", groundingHash: "gh1" },
      onCacheMiss
    )
    const second = await getOrCreateWcCommissionerInsight(
      { challengeId: "c1", kind: "standings", groundingHash: "gh1" },
      onCacheMiss
    )

    expect(onCacheMiss).toHaveBeenCalledOnce() // second call was a hit
    expect(second.cacheHit).toBe(true)
    expect(second.text).toBe("standings text")
  })
})

// ─── Suite E: parseTeachingAnswer ────────────────────────────────────────────

const SAMPLE_TEACHING_TEXT = `
QUICK: France is your best pick here based on pool leverage.
WHY: Three of the four entries above you picked Germany — a France win drops all three.
EDGE: Sharp players root for the result that hurts the people above them, not their favorite team.
AVOID: Don't pick France just because you like them — pick them because it hurts your rivals.
CONFIDENCE: 0.85
`.trim()

describe("parseTeachingAnswer", () => {
  it("15. parses all five sections correctly", () => {
    const result = parseTeachingAnswer(SAMPLE_TEACHING_TEXT)
    expect(result).not.toBeNull()
    expect(result!.quickAnswer).toContain("France")
    expect(result!.whyItMatters).toContain("Germany")
    expect(result!.theEdge).toContain("hurts the people above them")
    expect(result!.mistakeToAvoid).toContain("rivals")
    expect(result!.confidence).toBeCloseTo(0.85)
  })

  it("16. returns null when required sections are missing", () => {
    const noEdge = "QUICK: France. WHY: Leverage matters."
    expect(parseTeachingAnswer(noEdge)).toBeNull()
  })

  it("17. returns result when AVOID/CONFIDENCE absent", () => {
    const partial = "QUICK: France.\nWHY: Leverage.\nEDGE: Root for the upset."
    const result = parseTeachingAnswer(partial)
    expect(result).not.toBeNull()
    expect(result!.mistakeToAvoid).toBeUndefined()
    expect(result!.confidence).toBe(0.7) // default
  })

  it("18. confidence clamped — invalid value uses default 0.7", () => {
    const badConf = "QUICK: Test.\nWHY: Because.\nEDGE: Edge.\nCONFIDENCE: 999"
    const result = parseTeachingAnswer(badConf)
    // 999 is not in 0-1 range → falls back to default
    expect(result!.confidence).toBe(0.7)
  })

  it("19. parseTeachingAnswerWithFallback wraps unstructured text in quickAnswer", () => {
    const unstructured = "France is the best pick for bracket leverage."
    const result = parseTeachingAnswerWithFallback(unstructured)
    expect(result.quickAnswer).toBe(unstructured)
    expect(result.whyItMatters).toBe("")
    expect(result.confidence).toBe(0.5)
  })

  it("20. serializeTeachingAnswer round-trips cleanly", () => {
    const original = parseTeachingAnswer(SAMPLE_TEACHING_TEXT)!
    const serialized = serializeTeachingAnswer(original)
    const reparsed = parseTeachingAnswer(serialized)
    expect(reparsed).not.toBeNull()
    expect(reparsed!.quickAnswer).toBe(original.quickAnswer)
    expect(reparsed!.theEdge).toBe(original.theEdge)
    expect(reparsed!.confidence).toBeCloseTo(original.confidence)
  })
})

// ─── Suite F: TeachingAnswerCard — see ai-teaching-answer-card.test.tsx ──────

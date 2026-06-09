/**
 * AiFeedback tests
 *
 * Suite A: saveAiFeedback
 *  1. Saves a helpful rating and returns the row
 *  2. Saves a not_helpful rating
 *  3. promptHash is a 16-char hex string derived from promptText
 *  4. No promptText → promptHash is null
 *  5. Upsert: second call with same key calls upsert with update branch
 *  6. DB error → returns null (non-fatal)
 *  7. No resultKey → uses empty string sentinel in unique key
 *
 * Suite B: getUserFeedbackForResult
 *  8. Returns "helpful" when row exists with that rating
 *  9. Returns null when no row found
 * 10. DB error → returns null (non-fatal)
 *
 * Suite C: getAiFeedbackStats
 * 11. Returns correct helpful/notHelpful/total counts
 * 12. Returns zeros when no rows exist
 * 13. DB error → returns zeros (non-fatal)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

const prismaMock = vi.hoisted(() => ({
  aiFeedback: {
    upsert: vi.fn(),
    findFirst: vi.fn(),
    groupBy: vi.fn(),
  },
}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

beforeEach(() => {
  vi.clearAllMocks()
})

import { saveAiFeedback, getUserFeedbackForResult, getAiFeedbackStats } from "@/lib/ai/aiFeedback"

function makeFeedbackRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "fb-1",
    userId: "u1",
    feature: "wc_chimmy",
    resultKey: "key-1",
    rating: "helpful",
    promptHash: "abc123def456abcd",
    sport: "world_cup",
    createdAt: new Date(),
    ...overrides,
  }
}

// ─── Suite A: saveAiFeedback ──────────────────────────────────────────────────

describe("saveAiFeedback", () => {
  it("1. saves a helpful rating and returns the row", async () => {
    prismaMock.aiFeedback.upsert.mockResolvedValue(makeFeedbackRow())
    const result = await saveAiFeedback({
      userId: "u1",
      feature: "wc_chimmy",
      rating: "helpful",
      resultKey: "key-1",
    })
    expect(result).not.toBeNull()
    expect(result!.rating).toBe("helpful")
    expect(prismaMock.aiFeedback.upsert).toHaveBeenCalledOnce()
  })

  it("2. saves a not_helpful rating", async () => {
    prismaMock.aiFeedback.upsert.mockResolvedValue(makeFeedbackRow({ rating: "not_helpful" }))
    const result = await saveAiFeedback({
      userId: "u1",
      feature: "wc_chimmy",
      rating: "not_helpful",
    })
    expect(result!.rating).toBe("not_helpful")
  })

  it("3. promptHash is a 16-char hex string derived from promptText", async () => {
    let capturedCreate: Record<string, unknown> = {}
    prismaMock.aiFeedback.upsert.mockImplementation(({ create }: any) => {
      capturedCreate = create
      return Promise.resolve(makeFeedbackRow())
    })

    await saveAiFeedback({
      userId: "u1",
      feature: "wc_chimmy",
      rating: "helpful",
      promptText: "Who is leading the pool?",
    })

    expect(capturedCreate.promptHash).toMatch(/^[0-9a-f]{16}$/)
  })

  it("4. no promptText → promptHash is null", async () => {
    let capturedCreate: Record<string, unknown> = {}
    prismaMock.aiFeedback.upsert.mockImplementation(({ create }: any) => {
      capturedCreate = create
      return Promise.resolve(makeFeedbackRow({ promptHash: null }))
    })

    await saveAiFeedback({ userId: "u1", feature: "wc_chimmy", rating: "helpful" })
    expect(capturedCreate.promptHash).toBeNull()
  })

  it("5. upsert: second call with same key updates the rating", async () => {
    prismaMock.aiFeedback.upsert
      .mockResolvedValueOnce(makeFeedbackRow({ rating: "helpful" }))
      .mockResolvedValueOnce(makeFeedbackRow({ rating: "not_helpful" }))

    await saveAiFeedback({ userId: "u1", feature: "wc_chimmy", rating: "helpful", resultKey: "key-1" })
    const updated = await saveAiFeedback({ userId: "u1", feature: "wc_chimmy", rating: "not_helpful", resultKey: "key-1" })

    expect(prismaMock.aiFeedback.upsert).toHaveBeenCalledTimes(2)
    expect(updated!.rating).toBe("not_helpful")
  })

  it("6. DB error → returns null (non-fatal)", async () => {
    prismaMock.aiFeedback.upsert.mockRejectedValue(new Error("DB down"))
    const result = await saveAiFeedback({ userId: "u1", feature: "wc_chimmy", rating: "helpful" })
    expect(result).toBeNull()
  })

  it("7. no resultKey → uses empty string sentinel in unique key", async () => {
    let capturedWhere: Record<string, unknown> = {}
    prismaMock.aiFeedback.upsert.mockImplementation(({ where }: any) => {
      capturedWhere = where
      return Promise.resolve(makeFeedbackRow())
    })

    await saveAiFeedback({ userId: "u1", feature: "wc_chimmy", rating: "helpful" })

    // The unique key uses "" as sentinel when resultKey is null
    expect(capturedWhere.userId_feature_resultKey).toMatchObject({
      resultKey: "",
    })
  })
})

// ─── Suite B: getUserFeedbackForResult ────────────────────────────────────────

describe("getUserFeedbackForResult", () => {
  it("8. returns 'helpful' when row exists", async () => {
    prismaMock.aiFeedback.findFirst.mockResolvedValue({ rating: "helpful" })
    const rating = await getUserFeedbackForResult("u1", "wc_chimmy", "key-1")
    expect(rating).toBe("helpful")
  })

  it("9. returns null when no row found", async () => {
    prismaMock.aiFeedback.findFirst.mockResolvedValue(null)
    const rating = await getUserFeedbackForResult("u1", "wc_chimmy", "key-1")
    expect(rating).toBeNull()
  })

  it("10. DB error → returns null (non-fatal)", async () => {
    prismaMock.aiFeedback.findFirst.mockRejectedValue(new Error("DB down"))
    const rating = await getUserFeedbackForResult("u1", "wc_chimmy", "key-1")
    expect(rating).toBeNull()
  })
})

// ─── Suite C: getAiFeedbackStats ──────────────────────────────────────────────

describe("getAiFeedbackStats", () => {
  it("11. returns correct helpful/notHelpful/total counts", async () => {
    prismaMock.aiFeedback.groupBy.mockResolvedValue([
      { rating: "helpful", _count: { rating: 42 } },
      { rating: "not_helpful", _count: { rating: 8 } },
    ])
    const stats = await getAiFeedbackStats("wc_chimmy")
    expect(stats.helpful).toBe(42)
    expect(stats.notHelpful).toBe(8)
    expect(stats.total).toBe(50)
  })

  it("12. returns zeros when no rows exist", async () => {
    prismaMock.aiFeedback.groupBy.mockResolvedValue([])
    const stats = await getAiFeedbackStats("wc_chimmy")
    expect(stats).toEqual({ helpful: 0, notHelpful: 0, total: 0 })
  })

  it("13. DB error → returns zeros (non-fatal)", async () => {
    prismaMock.aiFeedback.groupBy.mockRejectedValue(new Error("DB down"))
    const stats = await getAiFeedbackStats("wc_chimmy")
    expect(stats).toEqual({ helpful: 0, notHelpful: 0, total: 0 })
  })
})

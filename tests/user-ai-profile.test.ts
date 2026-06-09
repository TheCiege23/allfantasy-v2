/**
 * UserAiProfile tests
 *
 * Suite A: getUserAiProfile — read path
 *  1. Returns null when DB row does not exist
 *  2. Returns profile with all null fields when row has no AI fields set
 *  3. Maps aiStrategyModeDefault → skillLevel correctly
 *  4. Maps riskProfile → riskStyle correctly
 *  5. Maps aiExplanationStyle → explanationStyle correctly
 *  6. Parses preferredSports JSON array into favoriteSports
 *  7. Invalid aiStrategyModeDefault value → skillLevel=null
 *  8. Invalid riskProfile value → riskStyle=null
 *  9. DB read failure → returns null (non-fatal)
 *
 * Suite B: updateUserAiProfile — write path
 * 10. Partial update: only skillLevel field is written
 * 11. Partial update: only explanationStyle field is written
 * 12. Empty update object → calls read, not write
 * 13. Null values in update → written as null (clears field)
 * 14. DB write failure → returns null (non-fatal)
 *
 * Suite C: applyProfileDefaults
 * 15. null profile → all fields use product defaults
 * 16. Profile with nulls → null fields replaced by defaults
 * 17. Profile with values → values preserved, no defaults applied
 *
 * Suite D: buildPersonalizationSuffix
 * 18. beginner → plain language instruction appended
 * 19. advanced → skip-basic-explanation instruction appended
 * 20. conservative → bust-risk instruction appended
 * 21. aggressive → contrarian/variance instruction appended
 * 22. concise → 2-3 sentences maximum instruction appended
 * 23. intermediate + balanced + teaching → empty string (no overrides)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

const prismaMock = vi.hoisted(() => ({
  userProfile: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

beforeEach(() => {
  vi.clearAllMocks()
})

import {
  getUserAiProfile,
  updateUserAiProfile,
  applyProfileDefaults,
  buildPersonalizationSuffix,
  USER_AI_PROFILE_DEFAULTS,
} from "@/lib/ai/userAiProfile"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDbRow(overrides: Record<string, unknown> = {}) {
  return {
    aiStrategyModeDefault: null,
    riskProfile: null,
    preferredSports: null,
    aiExplanationStyle: null,
    updatedAt: new Date("2026-06-01T00:00:00Z"),
    ...overrides,
  }
}

// ─── Suite A: getUserAiProfile ────────────────────────────────────────────────

describe("getUserAiProfile", () => {
  it("1. returns null when DB row does not exist", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(null)
    expect(await getUserAiProfile("u1")).toBeNull()
  })

  it("2. returns profile with null AI fields when none are set", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(makeDbRow())
    const p = await getUserAiProfile("u1")
    expect(p).not.toBeNull()
    expect(p!.skillLevel).toBeNull()
    expect(p!.riskStyle).toBeNull()
    expect(p!.explanationStyle).toBeNull()
    expect(p!.favoriteSports).toEqual([])
  })

  it("3. maps aiStrategyModeDefault → skillLevel", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(makeDbRow({ aiStrategyModeDefault: "advanced" }))
    const p = await getUserAiProfile("u1")
    expect(p!.skillLevel).toBe("advanced")
  })

  it("4. maps riskProfile → riskStyle", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(makeDbRow({ riskProfile: "aggressive" }))
    const p = await getUserAiProfile("u1")
    expect(p!.riskStyle).toBe("aggressive")
  })

  it("5. maps aiExplanationStyle → explanationStyle", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(makeDbRow({ aiExplanationStyle: "concise" }))
    const p = await getUserAiProfile("u1")
    expect(p!.explanationStyle).toBe("concise")
  })

  it("6. parses preferredSports array into favoriteSports", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(
      makeDbRow({ preferredSports: ["world_cup", "nfl"] })
    )
    const p = await getUserAiProfile("u1")
    expect(p!.favoriteSports).toEqual(["world_cup", "nfl"])
  })

  it("7. invalid aiStrategyModeDefault → skillLevel=null", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(makeDbRow({ aiStrategyModeDefault: "expert" }))
    const p = await getUserAiProfile("u1")
    expect(p!.skillLevel).toBeNull()
  })

  it("8. invalid riskProfile → riskStyle=null", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(makeDbRow({ riskProfile: "yolo" }))
    const p = await getUserAiProfile("u1")
    expect(p!.riskStyle).toBeNull()
  })

  it("9. DB read failure → returns null (non-fatal)", async () => {
    prismaMock.userProfile.findUnique.mockRejectedValue(new Error("DB down"))
    expect(await getUserAiProfile("u1")).toBeNull()
  })
})

// ─── Suite B: updateUserAiProfile ────────────────────────────────────────────

describe("updateUserAiProfile", () => {
  it("10. partial update: only skillLevel written", async () => {
    const returnRow = makeDbRow({ aiStrategyModeDefault: "beginner" })
    prismaMock.userProfile.update.mockResolvedValue(returnRow)

    await updateUserAiProfile("u1", { skillLevel: "beginner" })

    expect(prismaMock.userProfile.update).toHaveBeenCalledOnce()
    const callArgs = prismaMock.userProfile.update.mock.calls[0][0]
    expect(callArgs.data).toHaveProperty("aiStrategyModeDefault", "beginner")
    // Other fields should NOT be in data
    expect(callArgs.data).not.toHaveProperty("riskProfile")
    expect(callArgs.data).not.toHaveProperty("aiExplanationStyle")
  })

  it("11. partial update: only explanationStyle written", async () => {
    const returnRow = makeDbRow({ aiExplanationStyle: "detailed" })
    prismaMock.userProfile.update.mockResolvedValue(returnRow)

    await updateUserAiProfile("u1", { explanationStyle: "detailed" })

    const callArgs = prismaMock.userProfile.update.mock.calls[0][0]
    expect(callArgs.data).toHaveProperty("aiExplanationStyle", "detailed")
    expect(callArgs.data).not.toHaveProperty("aiStrategyModeDefault")
  })

  it("12. empty update object → read, not write", async () => {
    // findUnique is called when there's nothing to update
    prismaMock.userProfile.findUnique.mockResolvedValue(makeDbRow())

    await updateUserAiProfile("u1", {})

    expect(prismaMock.userProfile.update).not.toHaveBeenCalled()
    expect(prismaMock.userProfile.findUnique).toHaveBeenCalledOnce()
  })

  it("13. null values in update → written as null (clears field)", async () => {
    const returnRow = makeDbRow()
    prismaMock.userProfile.update.mockResolvedValue(returnRow)

    await updateUserAiProfile("u1", { skillLevel: null, riskStyle: null })

    const callArgs = prismaMock.userProfile.update.mock.calls[0][0]
    expect(callArgs.data.aiStrategyModeDefault).toBeNull()
    expect(callArgs.data.riskProfile).toBeNull()
  })

  it("14. DB write failure → returns null (non-fatal)", async () => {
    prismaMock.userProfile.update.mockRejectedValue(new Error("DB down"))
    const result = await updateUserAiProfile("u1", { skillLevel: "advanced" })
    expect(result).toBeNull()
  })
})

// ─── Suite C: applyProfileDefaults ───────────────────────────────────────────

describe("applyProfileDefaults", () => {
  it("15. null profile → all fields use product defaults", () => {
    const effective = applyProfileDefaults(null, "u1")
    expect(effective.skillLevel).toBe(USER_AI_PROFILE_DEFAULTS.skillLevel)
    expect(effective.riskStyle).toBe(USER_AI_PROFILE_DEFAULTS.riskStyle)
    expect(effective.explanationStyle).toBe(USER_AI_PROFILE_DEFAULTS.explanationStyle)
    expect(effective.favoriteSports).toEqual([])
  })

  it("16. profile with nulls → null fields replaced by defaults", () => {
    const profile = {
      userId: "u1",
      skillLevel: null,
      riskStyle: null,
      favoriteSports: [],
      explanationStyle: null,
      updatedAt: new Date(),
    }
    const effective = applyProfileDefaults(profile, "u1")
    expect(effective.skillLevel).toBe("intermediate")
    expect(effective.riskStyle).toBe("balanced")
    expect(effective.explanationStyle).toBe("teaching")
  })

  it("17. profile with values → values preserved, no defaults applied", () => {
    const profile = {
      userId: "u1",
      skillLevel: "advanced" as const,
      riskStyle: "aggressive" as const,
      favoriteSports: ["nfl"],
      explanationStyle: "concise" as const,
      updatedAt: new Date(),
    }
    const effective = applyProfileDefaults(profile, "u1")
    expect(effective.skillLevel).toBe("advanced")
    expect(effective.riskStyle).toBe("aggressive")
    expect(effective.explanationStyle).toBe("concise")
    expect(effective.favoriteSports).toEqual(["nfl"])
  })
})

// ─── Suite D: buildPersonalizationSuffix ─────────────────────────────────────

function effectiveProfile(overrides: Partial<Parameters<typeof buildPersonalizationSuffix>[0]>) {
  return {
    userId: "u1",
    skillLevel: "intermediate" as const,
    riskStyle: "balanced" as const,
    favoriteSports: [],
    explanationStyle: "teaching" as const,
    ...overrides,
  }
}

describe("buildPersonalizationSuffix", () => {
  it("18. beginner → plain language instruction appended", () => {
    const suffix = buildPersonalizationSuffix(effectiveProfile({ skillLevel: "beginner" }))
    expect(suffix).toContain("plain language")
    expect(suffix.length).toBeGreaterThan(0)
  })

  it("19. advanced → skip-basic-explanation instruction appended", () => {
    const suffix = buildPersonalizationSuffix(effectiveProfile({ skillLevel: "advanced" }))
    expect(suffix).toContain("experienced")
    expect(suffix).toContain("strategic insight")
  })

  it("20. conservative → bust-risk instruction appended", () => {
    const suffix = buildPersonalizationSuffix(effectiveProfile({ riskStyle: "conservative" }))
    expect(suffix).toContain("bust risk")
  })

  it("21. aggressive → contrarian/variance instruction appended", () => {
    const suffix = buildPersonalizationSuffix(effectiveProfile({ riskStyle: "aggressive" }))
    expect(suffix).toContain("contrarian")
  })

  it("22. concise → 2-3 sentences maximum instruction appended", () => {
    const suffix = buildPersonalizationSuffix(effectiveProfile({ explanationStyle: "concise" }))
    expect(suffix).toContain("2-3 sentences")
  })

  it("23. intermediate + balanced + teaching → empty string (no overrides)", () => {
    // These are the defaults — no personalization suffix needed
    const suffix = buildPersonalizationSuffix(effectiveProfile({}))
    expect(suffix).toBe("")
  })
})

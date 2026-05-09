import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}))

const resolveForUser = vi.fn()

vi.mock("@/lib/subscription/EntitlementResolver", () => ({
  EntitlementResolver: class {
    resolveForUser = resolveForUser
  },
}))

describe("Bracket Brain access path", () => {
  beforeEach(() => {
    resolveForUser.mockReset()
  })

  it("exports AF Pro feature id for bracket brain", async () => {
    const { BRACKET_BRAIN_AI_FEATURE } = await import(
      "@/lib/bracket-brain/bracketBrainAccess"
    )
    expect(BRACKET_BRAIN_AI_FEATURE).toBe("league_ai_coaching")
  })

  it("userHasBracketBrainAi reads league_ai_coaching entitlement", async () => {
    resolveForUser.mockResolvedValue({
      hasAccess: true,
      message: "ok",
      entitlement: { plans: ["pro"], status: "active", currentPeriodEnd: null, gracePeriodEnd: null },
    })
    vi.resetModules()
    const { userHasBracketBrainAi } = await import(
      "@/lib/bracket-brain/bracketBrainAccess"
    )
    await expect(userHasBracketBrainAi("user-1", null)).resolves.toBe(true)
    expect(resolveForUser).toHaveBeenCalled()
    const featureArg = resolveForUser.mock.calls[0]?.[1]
    expect(featureArg).toBe("league_ai_coaching")
  })
})

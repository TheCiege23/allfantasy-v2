import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    gameSchedule: {
      count: vi.fn().mockResolvedValue(0),
    },
  },
}))

describe("global Chimmy intent routing", () => {
  it("routes World Cup scoring to no-charge World Cup grounding", async () => {
    const { resolveChimmyIntentRoute, isNoChargeChimmyIntent } = await import("@/lib/ai/chimmyIntentRouter")

    const route = resolveChimmyIntentRoute("Explain scoring for World Cup")

    expect(route).toMatchObject({
      category: "world_cup_scoring",
      dataSource: "world_cup_cache",
      groundingService: "worldCupChimmyGroundingService",
      tokenPolicy: "no_charge",
    })
    expect(isNoChargeChimmyIntent("Explain scoring for World Cup")).toBe(true)
  })

  it("answers World Cup scoring deterministically without generic unsupported-sports refusal", async () => {
    const { tryDeterministicAnswer } = await import("@/lib/ai/deterministic")

    const answer = await tryDeterministicAnswer("Explain scoring for World Cup", "en")

    expect(answer).toContain("World Cup bracket scoring is supported")
    expect(answer).toContain("champion bonus")
    expect(answer).not.toMatch(/only help with NFL|unsupported/i)
  })

  it("blocks unavailable World Cup live facts without charging tokens", async () => {
    const { resolveChimmyIntentRoute } = await import("@/lib/ai/chimmyIntentRouter")
    const { tryDeterministicAnswer } = await import("@/lib/ai/deterministic")

    const route = resolveChimmyIntentRoute("What are the live World Cup odds and injuries right now?")
    const answer = await tryDeterministicAnswer("What are the live World Cup odds and injuries right now?", "en")

    expect(route.category).toBe("unsupported_live_data")
    expect(route.tokenPolicy).toBe("blocked_no_charge")
    expect(answer).toContain("I don't have fresh live provider data")
    expect(answer).toContain("should not charge tokens")
  })
})

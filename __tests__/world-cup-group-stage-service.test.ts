import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({
  prisma: {},
}))

describe("World Cup group stage service exports", () => {
  it("exposes the named gameplay service functions used by API routes", async () => {
    const service = await import("@/lib/world-cup/worldCupGroupStageService")

    expect(service.getWorldCupGroupStageView).toEqual(expect.any(Function))
    expect(service.saveWorldCupGroupRanking).toEqual(expect.any(Function))
    expect(service.saveWorldCupThirdPlaceAdvancers).toEqual(expect.any(Function))
    expect(service.ensureWorldCupGroupsForChallenge).toEqual(expect.any(Function))
  })
})

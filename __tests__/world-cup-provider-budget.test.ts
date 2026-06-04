import { beforeEach, describe, expect, it, vi } from "vitest"

const canCallMock = vi.hoisted(() => vi.fn())
const recordCallMock = vi.hoisted(() => vi.fn())
const callLogFindFirstMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/workers/rate-limit-manager", () => ({
  rateLimitManager: {
    canCall: canCallMock,
    recordCall: recordCallMock,
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiCallLogRecord: {
      findFirst: callLogFindFirstMock,
    },
  },
}))

describe("World Cup provider budget guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    canCallMock.mockResolvedValue(true)
    recordCallMock.mockResolvedValue(undefined)
    callLogFindFirstMock.mockResolvedValue(null)
  })

  it("blocks provider calls when the daily/hourly budget is exhausted", async () => {
    canCallMock.mockResolvedValue(false)
    const { assertWorldCupProviderCallAllowed } = await import("@/lib/world-cup/worldCupProviderBudget")

    await expect(assertWorldCupProviderCallAllowed("api_football", "world_cup:fixtures")).rejects.toThrow(/budget exhausted/i)
    expect(callLogFindFirstMock).not.toHaveBeenCalled()
  })

  it("blocks repeated endpoint refreshes during cooldown", async () => {
    callLogFindFirstMock.mockResolvedValue({ calledAt: new Date() })
    const { assertWorldCupProviderCallAllowed } = await import("@/lib/world-cup/worldCupProviderBudget")

    await expect(assertWorldCupProviderCallAllowed("api_football", "world_cup:standings")).rejects.toThrow(/cooldown active/i)
  })

  it("records successful provider calls through the shared log tables", async () => {
    const { withWorldCupProviderBudget } = await import("@/lib/world-cup/worldCupProviderBudget")

    const result = await withWorldCupProviderBudget("api_football", "world_cup:fixtures:today", async () => "ok")

    expect(result).toBe("ok")
    expect(recordCallMock).toHaveBeenCalledWith("api_football", "world_cup:fixtures:today", 200, expect.any(Number), {
      error: null,
      cached: false,
    })
  })
})

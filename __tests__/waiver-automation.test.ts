import { describe, expect, it, vi, beforeEach } from "vitest"

import { discoverDueWaiverLeagues } from "@/lib/automation/jobs/waivers/discoverDueWaiverLeagues"
import { buildWaiverJobIdempotencyKey } from "@/lib/automation/jobs/waivers/processLeagueWaiversJob"
import { summarizeWaiverProcessingResults } from "@/lib/automation/jobs/waivers/waiverAutomationSummary"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    waiverClaim: {
      groupBy: vi.fn(),
    },
    waiverRun: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock("@/lib/waiver-wire/settings-service", () => ({
  getEffectiveLeagueWaiverSettings: vi.fn(),
}))

vi.mock("@/lib/waiver-wire/waiver-state-service", () => ({
  getLeagueWaiverState: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import { getEffectiveLeagueWaiverSettings } from "@/lib/waiver-wire/settings-service"
import { getLeagueWaiverState } from "@/lib/waiver-wire/waiver-state-service"

describe("waiver automation idempotency key", () => {
  it("is stable for leagueId + UTC date bucket", () => {
    const d = new Date("2026-07-01T15:30:00.000Z")
    expect(buildWaiverJobIdempotencyKey("league-a", d)).toBe(
      buildWaiverJobIdempotencyKey("league-a", d)
    )
    expect(buildWaiverJobIdempotencyKey("league-a", d)).not.toBe(
      buildWaiverJobIdempotencyKey("league-b", d)
    )
  })
})

describe("summarizeWaiverProcessingResults", () => {
  it("normalizes processor-shaped results", () => {
    const s = summarizeWaiverProcessingResults([
      {
        claimId: "c1",
        rosterId: "r1",
        success: true,
        addPlayerId: "p1",
        outcomeCode: "won",
      },
      {
        claimId: "c2",
        rosterId: "r2",
        success: false,
        addPlayerId: "p2",
        message: "lost",
        outcomeCode: "lost_priority",
      },
      {
        claimId: "c3",
        rosterId: "r3",
        success: false,
        addPlayerId: "p3",
        outcomeCode: "failed",
      },
    ])
    expect(s.processedClaims).toBe(3)
    expect(s.awardedClaims).toBe(1)
    expect(s.skippedClaims).toBe(1)
    expect(s.failedClaims).toBe(1)
    expect(s.transactionsCreated).toBe(1)
  })
})

describe("discoverDueWaiverLeagues", () => {
  beforeEach(() => {
    vi.mocked(prisma.waiverClaim.groupBy).mockReset()
    vi.mocked(prisma.waiverRun.findFirst).mockReset()
    vi.mocked(getEffectiveLeagueWaiverSettings).mockReset()
    vi.mocked(getLeagueWaiverState).mockReset()
  })

  it("returns no leagues when there are no pending claims", async () => {
    vi.mocked(prisma.waiverClaim.groupBy).mockResolvedValue([])
    const rows = await discoverDueWaiverLeagues({ limit: 25 })
    expect(rows).toEqual([])
    expect(prisma.waiverClaim.groupBy).toHaveBeenCalled()
  })
})

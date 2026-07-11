import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  integrityFlagCreate: vi.fn(),
  integrityFlagFindMany: vi.fn(),
  integrityFlagFindUnique: vi.fn(),
  integrityFlagUpdate: vi.fn(),
  householdExceptionUpsert: vi.fn(),
  createFantasyLeagueRosterBypassingRiskCheck: vi.fn(),
  incrementInviteUseCountById: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    integrityFlag: {
      create: mocks.integrityFlagCreate,
      findMany: mocks.integrityFlagFindMany,
      findUnique: mocks.integrityFlagFindUnique,
      update: mocks.integrityFlagUpdate,
    },
    householdException: { upsert: mocks.householdExceptionUpsert },
  },
}))

vi.mock("@/lib/invite-engine/InviteEngine", () => ({
  createFantasyLeagueRosterBypassingRiskCheck: mocks.createFantasyLeagueRosterBypassingRiskCheck,
  incrementInviteUseCountById: mocks.incrementInviteUseCountById,
}))

import {
  createDuplicateManagerFlag,
  listDuplicateManagerFlags,
  resolveDuplicateManagerFlag,
} from "@/lib/identity/DuplicateManagerFlagService"
import type { DuplicateManagerAssessment } from "@/lib/identity/DuplicateManagerRiskService"

const ASSESSMENT: DuplicateManagerAssessment = {
  riskLevel: "high",
  topScore: 80,
  comparisons: [
    {
      suspectAppUserId: "suspect-1",
      suspectRosterId: "roster-1",
      suspectLabel: "Existing Manager",
      score: 80,
      riskLevel: "high",
      reasons: ["Shared network signal with an existing manager", "Shared device signal with an existing manager"],
      householdExempt: false,
    },
  ],
}

describe("DuplicateManagerFlagService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a flag using the shared IntegrityFlag model with flagType = duplicate_manager, never leaking raw evidence beyond reason strings", async () => {
    mocks.integrityFlagCreate.mockResolvedValue({ id: "flag-1" })

    const flagId = await createDuplicateManagerFlag({
      leagueId: "league-1",
      joiningUserId: "joiner-1",
      assessment: ASSESSMENT,
      status: "pending_review",
      inviteLinkId: "invite-1",
    })

    expect(flagId).toBe("flag-1")
    const callArgs = mocks.integrityFlagCreate.mock.calls[0][0]
    expect(callArgs.data.flagType).toBe("duplicate_manager")
    expect(callArgs.data.status).toBe("pending_review")
    expect(callArgs.data.severity).toBe("high")
    expect(callArgs.data.affectedRosterIds).toEqual(["roster-1"])
    // evidenceJson only ever holds appUserIds/rosterIds/labels/reasons — assert no ip/deviceId/userAgent keys leak in.
    const evidenceStr = JSON.stringify(callArgs.data.evidenceJson)
    expect(evidenceStr).not.toMatch(/ip|deviceId|userAgent/i)
  })

  it("lists flags for a league without ever exposing raw evidenceJson, only pre-summarized reasons", async () => {
    mocks.integrityFlagFindMany.mockResolvedValue([
      {
        id: "flag-1",
        severity: "high",
        status: "pending_review",
        summary: "Possible duplicate manager — matches 1 existing manager in this league.",
        affectedTeamNames: ["Existing Manager"],
        createdAt: new Date("2026-01-01T00:00:00Z"),
        commissionerNote: null,
        evidenceJson: {
          joiningUserId: "joiner-1",
          comparisons: [{ suspectAppUserId: "suspect-1", suspectRosterId: "roster-1", suspectLabel: "Existing Manager", score: 80, reasons: ["Shared network signal with an existing manager"] }],
        },
      },
    ])

    const flags = await listDuplicateManagerFlags("league-1")
    expect(flags).toHaveLength(1)
    expect(flags[0].reasons).toEqual(["Shared network signal with an existing manager"])
    expect(flags[0]).not.toHaveProperty("evidenceJson")
  })

  it("resolving 'allow' on a join-blocking flag completes the join via the risk-check-bypassed path and marks the flag allowed", async () => {
    mocks.integrityFlagFindUnique.mockResolvedValue({
      id: "flag-1",
      flagType: "duplicate_manager",
      status: "pending_review",
      leagueId: "league-1",
      evidenceJson: { joiningUserId: "joiner-1", inviteLinkId: "invite-1", comparisons: [{ suspectAppUserId: "suspect-1" }] },
    })
    mocks.createFantasyLeagueRosterBypassingRiskCheck.mockResolvedValue({ ok: true, alreadyMember: false })
    mocks.incrementInviteUseCountById.mockResolvedValue(undefined)
    mocks.integrityFlagUpdate.mockResolvedValue({})

    const result = await resolveDuplicateManagerFlag({ flagId: "flag-1", leagueId: "league-1", action: "allow", commissionerUserId: "commish-1" })

    expect(result).toEqual({ ok: true, joinCompleted: true })
    expect(mocks.createFantasyLeagueRosterBypassingRiskCheck).toHaveBeenCalledWith("league-1", "joiner-1")
    expect(mocks.incrementInviteUseCountById).toHaveBeenCalledWith("invite-1")
    expect(mocks.integrityFlagUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "allowed" }) })
    )
  })

  it("resolving 'block' never completes the join", async () => {
    mocks.integrityFlagFindUnique.mockResolvedValue({
      id: "flag-2",
      flagType: "duplicate_manager",
      status: "pending_review",
      leagueId: "league-1",
      evidenceJson: { joiningUserId: "joiner-2", comparisons: [] },
    })
    mocks.integrityFlagUpdate.mockResolvedValue({})

    const result = await resolveDuplicateManagerFlag({ flagId: "flag-2", leagueId: "league-1", action: "block", commissionerUserId: "commish-1" })

    expect(result).toEqual({ ok: true, joinCompleted: false })
    expect(mocks.createFantasyLeagueRosterBypassingRiskCheck).not.toHaveBeenCalled()
    expect(mocks.integrityFlagUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "blocked" }) })
    )
  })

  it("resolving 'household' records a HouseholdException and still completes the join", async () => {
    mocks.integrityFlagFindUnique.mockResolvedValue({
      id: "flag-3",
      flagType: "duplicate_manager",
      status: "pending_review",
      leagueId: "league-1",
      evidenceJson: { joiningUserId: "joiner-3", comparisons: [{ suspectAppUserId: "suspect-3" }] },
    })
    mocks.householdExceptionUpsert.mockResolvedValue({})
    mocks.createFantasyLeagueRosterBypassingRiskCheck.mockResolvedValue({ ok: true, alreadyMember: false })
    mocks.integrityFlagUpdate.mockResolvedValue({})

    const result = await resolveDuplicateManagerFlag({ flagId: "flag-3", leagueId: "league-1", action: "household", commissionerUserId: "commish-1" })

    expect(result.ok).toBe(true)
    expect(mocks.householdExceptionUpsert).toHaveBeenCalled()
    expect(mocks.createFantasyLeagueRosterBypassingRiskCheck).toHaveBeenCalledWith("league-1", "joiner-3")
  })

  it("refuses to resolve an already-resolved flag", async () => {
    mocks.integrityFlagFindUnique.mockResolvedValue({
      id: "flag-4",
      flagType: "duplicate_manager",
      status: "allowed",
      leagueId: "league-1",
      evidenceJson: {},
    })

    const result = await resolveDuplicateManagerFlag({ flagId: "flag-4", leagueId: "league-1", action: "block", commissionerUserId: "commish-1" })
    expect(result).toEqual({ ok: false, error: "Flag already resolved" })
  })

  it("refuses to resolve a flag that belongs to a different league than the caller is a commissioner of", async () => {
    mocks.integrityFlagFindUnique.mockResolvedValue({
      id: "flag-5",
      flagType: "duplicate_manager",
      status: "pending_review",
      leagueId: "league-other",
      evidenceJson: { joiningUserId: "joiner-5", comparisons: [] },
    })

    const result = await resolveDuplicateManagerFlag({ flagId: "flag-5", leagueId: "league-1", action: "allow", commissionerUserId: "commish-1" })

    expect(result).toEqual({ ok: false, error: "Flag not found" })
    expect(mocks.createFantasyLeagueRosterBypassingRiskCheck).not.toHaveBeenCalled()
  })
})

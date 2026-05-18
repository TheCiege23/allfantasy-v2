import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const prismaMocks = vi.hoisted(() => ({
  worldCupBracketEntry: { updateMany: vi.fn() },
  worldCupBracketChallenge: { findUnique: vi.fn() },
  worldCupGroup: { createMany: vi.fn(), findMany: vi.fn() },
  worldCupTeam: { findMany: vi.fn(), upsert: vi.fn() },
  worldCupGroupTeam: { findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
  worldCupGroupRankingPick: { findMany: vi.fn(), deleteMany: vi.fn() },
  worldCupThirdPlaceAdvancerPick: { findMany: vi.fn(), deleteMany: vi.fn() },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMocks,
}))

describe("World Cup group stage service exports", () => {
  it("exposes the named gameplay service functions used by API routes", async () => {
    const service = await import("@/lib/world-cup/worldCupGroupStageService")

    expect(service.getWorldCupGroupStageView).toEqual(expect.any(Function))
    expect(service.saveWorldCupGroupRanking).toEqual(expect.any(Function))
    expect(service.saveWorldCupThirdPlaceAdvancers).toEqual(expect.any(Function))
    expect(service.ensureWorldCupGroupsForChallenge).toEqual(expect.any(Function))
  })

  beforeEach(() => {
    vi.clearAllMocks()
    prismaMocks.worldCupGroupRankingPick.findMany.mockResolvedValue([])
    prismaMocks.worldCupThirdPlaceAdvancerPick.findMany.mockResolvedValue([])
    prismaMocks.worldCupGroupRankingPick.deleteMany.mockResolvedValue({ count: 0 })
    prismaMocks.worldCupThirdPlaceAdvancerPick.deleteMany.mockResolvedValue({ count: 0 })
    prismaMocks.worldCupBracketEntry.updateMany.mockResolvedValue({ count: 0 })
  })

  it("replaces stale demo group rows with official 2026 group teams when official data is available", async () => {
    const service = await import("@/lib/world-cup/worldCupGroupStageService")
    const groupA = { id: "group-a", challengeId: "c1", groupKey: "A", displayName: "Group A", sortOrder: 1, teams: [{ teamId: "demo_team_brazil" }] }
    const officialTeams = [
      { id: "team-mexico", name: "Mexico", country: "Mexico", fifaCode: "MEX", groupName: "A", qualificationStatus: "qualified", sourcePayload: null },
      { id: "team-korea", name: "South Korea", country: "South Korea", fifaCode: "KOR", groupName: "A", qualificationStatus: "qualified", sourcePayload: null },
      { id: "team-south-africa", name: "South Africa", country: "South Africa", fifaCode: "RSA", groupName: "A", qualificationStatus: "qualified", sourcePayload: null },
      { id: "team-czechia", name: "Czechia", country: "Czechia", fifaCode: "CZE", groupName: "A", qualificationStatus: "qualified", sourcePayload: null },
    ]
    const staleRow = {
      id: "stale-row",
      teamId: "demo_team_brazil",
      seedOrder: 1,
      team: { id: "demo_team_brazil", name: "Brazil", country: "Brazil", fifaCode: "BRA", qualificationStatus: "test", sourcePayload: { testFixture: true } },
    }

    prismaMocks.worldCupBracketChallenge.findUnique.mockResolvedValue({ id: "c1", sourcePayload: null })
    prismaMocks.worldCupGroup.findMany
      .mockResolvedValueOnce([groupA])
      .mockResolvedValueOnce([
        {
          ...groupA,
          teams: officialTeams.map((team, index) => ({
            id: `row-${team.id}`,
            teamId: team.id,
            seedOrder: index + 1,
            actualRank: null,
            points: null,
            goalDifference: null,
            goalsFor: null,
            team,
          })),
        },
      ])
    prismaMocks.worldCupTeam.findMany.mockResolvedValue(officialTeams)
    prismaMocks.worldCupGroupTeam.findMany.mockResolvedValue([staleRow])

    const result = await service.ensureWorldCupGroupsForChallenge("c1")

    expect(prismaMocks.worldCupGroupTeam.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["stale-row"] } } })
    expect(prismaMocks.worldCupGroupTeam.createMany).toHaveBeenCalledWith({
      data: officialTeams.map((team, index) => ({
        challengeId: "c1",
        groupId: "group-a",
        teamId: team.id,
        seedOrder: index + 1,
      })),
      skipDuplicates: true,
    })
    expect(result.warnings).toEqual([
      {
        code: "GROUP_STALE_TEST_TEAMS_REPLACED",
        groupKey: "A",
        message: "Group A replaced stale demo/test team rows with official 2026 group teams. Cleared 0 stale saved picks.",
      },
    ])
  })

  it("clears stale saved group and third-place picks that pointed at replaced demo teams", async () => {
    const service = await import("@/lib/world-cup/worldCupGroupStageService")
    const groupA = { id: "group-a", challengeId: "c1", groupKey: "A", displayName: "Group A", sortOrder: 1, teams: [{ teamId: "demo_team_brazil" }] }
    const officialTeams = [
      { id: "team-mexico", name: "Mexico", country: "Mexico", fifaCode: "MEX", groupName: "A", qualificationStatus: "qualified", sourcePayload: null },
      { id: "team-korea", name: "South Korea", country: "South Korea", fifaCode: "KOR", groupName: "A", qualificationStatus: "qualified", sourcePayload: null },
      { id: "team-south-africa", name: "South Africa", country: "South Africa", fifaCode: "RSA", groupName: "A", qualificationStatus: "qualified", sourcePayload: null },
      { id: "team-czechia", name: "Czechia", country: "Czechia", fifaCode: "CZE", groupName: "A", qualificationStatus: "qualified", sourcePayload: null },
    ]
    const staleRow = {
      id: "stale-row",
      teamId: "demo_team_brazil",
      seedOrder: 1,
      team: { id: "demo_team_brazil", name: "Brazil", country: "Brazil", fifaCode: "BRA", qualificationStatus: "test", sourcePayload: { testFixture: true } },
    }

    prismaMocks.worldCupBracketChallenge.findUnique.mockResolvedValue({ id: "c1", sourcePayload: null })
    prismaMocks.worldCupGroup.findMany
      .mockResolvedValueOnce([groupA])
      .mockResolvedValueOnce([{ ...groupA, teams: [] }])
    prismaMocks.worldCupTeam.findMany.mockResolvedValue(officialTeams)
    prismaMocks.worldCupGroupTeam.findMany.mockResolvedValue([staleRow])
    prismaMocks.worldCupGroupRankingPick.findMany.mockResolvedValue([{ entryId: "entry-1" }])
    prismaMocks.worldCupThirdPlaceAdvancerPick.findMany.mockResolvedValue([{ entryId: "entry-2" }])
    prismaMocks.worldCupGroupRankingPick.deleteMany.mockResolvedValue({ count: 1 })
    prismaMocks.worldCupThirdPlaceAdvancerPick.deleteMany.mockResolvedValue({ count: 1 })
    prismaMocks.worldCupBracketEntry.updateMany.mockResolvedValue({ count: 2 })

    const result = await service.ensureWorldCupGroupsForChallenge("c1")

    expect(prismaMocks.worldCupGroupRankingPick.deleteMany).toHaveBeenCalledWith({
      where: { challengeId: "c1", groupId: "group-a", teamId: { in: ["demo_team_brazil"] } },
    })
    expect(prismaMocks.worldCupThirdPlaceAdvancerPick.deleteMany).toHaveBeenCalledWith({
      where: { challengeId: "c1", groupId: "group-a", teamId: { in: ["demo_team_brazil"] } },
    })
    expect(prismaMocks.worldCupBracketEntry.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["entry-1", "entry-2"] }, submittedAt: { not: null } },
      data: { submittedAt: null, isComplete: false, isLocked: false },
    })
    expect(result.warnings[0].message).toContain("Cleared 2 stale saved picks.")
  })
})

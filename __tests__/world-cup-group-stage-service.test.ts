import { beforeEach, describe, expect, it, vi } from "vitest"
import { WORLD_CUP_2026_OFFICIAL_GROUPS } from "@/lib/world-cup/worldCupOfficialGroups"

vi.mock("server-only", () => ({}))

const prismaMocks = vi.hoisted(() => ({
  worldCupBracketEntry: { findUnique: vi.fn(), updateMany: vi.fn() },
  worldCupBracketChallenge: { findUnique: vi.fn() },
  worldCupGroup: { createMany: vi.fn(), findMany: vi.fn() },
  worldCupTeam: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), upsert: vi.fn() },
  worldCupGroupTeam: { findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
  worldCupGroupRankingPick: { findMany: vi.fn(), deleteMany: vi.fn() },
  worldCupThirdPlaceAdvancerPick: { findMany: vi.fn(), deleteMany: vi.fn() },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMocks,
}))

describe("World Cup group stage service exports", () => {
  it("defines exactly 12 official groups with 48 real teams", () => {
    const entries = Object.entries(WORLD_CUP_2026_OFFICIAL_GROUPS)
    expect(entries).toHaveLength(12)
    const allTeams = entries.flatMap(([groupKey, teams]) => {
      expect(teams).toHaveLength(4)
      for (const team of teams) {
        expect(team.group).toBe(groupKey)
        expect(team.name).not.toMatch(/TBD|Test Team/i)
        expect(team.fifaCode).toMatch(/^[A-Z]{3}$/)
      }
      return teams
    })
    expect(allTeams).toHaveLength(48)
    expect(new Set(allTeams.map((team) => team.fifaCode)).size).toBe(48)
  })

  it("exposes the named gameplay service functions used by API routes", async () => {
    const service = await import("@/lib/world-cup/worldCupGroupStageService")

    expect(service.getWorldCupGroupStageView).toEqual(expect.any(Function))
    expect(service.saveWorldCupGroupRanking).toEqual(expect.any(Function))
    expect(service.saveWorldCupThirdPlaceAdvancers).toEqual(expect.any(Function))
    expect(service.ensureWorldCupGroupsForChallenge).toEqual(expect.any(Function))
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    prismaMocks.worldCupGroupRankingPick.findMany.mockResolvedValue([])
    prismaMocks.worldCupThirdPlaceAdvancerPick.findMany.mockResolvedValue([])
    prismaMocks.worldCupGroupRankingPick.deleteMany.mockResolvedValue({ count: 0 })
    prismaMocks.worldCupThirdPlaceAdvancerPick.deleteMany.mockResolvedValue({ count: 0 })
    prismaMocks.worldCupBracketEntry.updateMany.mockResolvedValue({ count: 0 })
    prismaMocks.worldCupTeam.findFirst.mockImplementation(async ({ where }: { where: { OR?: Array<{ id?: string; fifaCode?: string; name?: { equals: string } }> } }) => {
      const id = where.OR?.find((row) => row.id)?.id ?? `team-${where.OR?.find((row) => row.fifaCode)?.fifaCode?.toLowerCase()}`
      return { id }
    })
    prismaMocks.worldCupTeam.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({ id: where.id, ...data }))
    prismaMocks.worldCupTeam.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => data)
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
    prismaMocks.worldCupTeam.findMany
      .mockResolvedValueOnce(officialTeams)
      .mockResolvedValueOnce(officialTeams)
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
        code: "GROUP_REBUILT_FROM_OFFICIAL_TEAMS",
        groupKey: "A",
        message: "Group A was rebuilt from the official 2026 group source. Cleared 0 stale saved picks.",
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
    prismaMocks.worldCupTeam.findMany
      .mockResolvedValueOnce(officialTeams)
      .mockResolvedValueOnce(officialTeams)
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

  it("materializes official teams and repairs live pools that only have demo/TBD rows", async () => {
    const service = await import("@/lib/world-cup/worldCupGroupStageService")
    const groupA = { id: "group-a", challengeId: "c1", groupKey: "A", displayName: "Group A", sortOrder: 1, teams: [{ teamId: "demo_team_brazil" }] }
    const officialTeams = [
      { id: "wc2026_official_mex", name: "Mexico", country: "Mexico", fifaCode: "MEX", groupName: "A", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 1 } },
      { id: "wc2026_official_kor", name: "South Korea", country: "South Korea", fifaCode: "KOR", groupName: "A", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 2 } },
      { id: "wc2026_official_rsa", name: "South Africa", country: "South Africa", fifaCode: "RSA", groupName: "A", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 3 } },
      { id: "wc2026_official_cze", name: "Czechia", country: "Czechia", fifaCode: "CZE", groupName: "A", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 4 } },
    ]
    const staleRows = [
      { id: "stale-arg", teamId: "demo_team_argentina", seedOrder: 1, team: { id: "demo_team_argentina", name: "Argentina", country: "Argentina", fifaCode: "ARG", qualificationStatus: "test", sourcePayload: { testFixture: true } } },
      { id: "stale-aus", teamId: "demo_team_australia", seedOrder: 2, team: { id: "demo_team_australia", name: "Australia", country: "Australia", fifaCode: "AUS", qualificationStatus: "test", sourcePayload: { testFixture: true } } },
      { id: "stale-bra", teamId: "demo_team_brazil", seedOrder: 3, team: { id: "demo_team_brazil", name: "Brazil", country: "Brazil", fifaCode: "BRA", qualificationStatus: "test", sourcePayload: { testFixture: true } } },
      { id: "stale-tbd", teamId: "wc2026_placeholder_c1_A_4", seedOrder: 4, team: { id: "wc2026_placeholder_c1_A_4", name: "Group A Test Team 4", country: "TBD Group A", fifaCode: "A4", qualificationStatus: "test_placeholder", sourcePayload: { source: "allfantasy_test_placeholder" } } },
    ]

    prismaMocks.worldCupBracketChallenge.findUnique.mockResolvedValue({ id: "c1", sourcePayload: null })
    prismaMocks.worldCupGroup.findMany
      .mockResolvedValueOnce([groupA])
      .mockResolvedValueOnce([{
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
      }])
    prismaMocks.worldCupTeam.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(officialTeams)
    prismaMocks.worldCupGroupTeam.findMany.mockResolvedValue(staleRows)

    const result = await service.ensureWorldCupGroupsForChallenge("c1")

    expect(prismaMocks.worldCupTeam.update).toHaveBeenCalled()
    expect(prismaMocks.worldCupGroupTeam.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["stale-arg", "stale-aus", "stale-bra", "stale-tbd"] } },
    })
    expect(prismaMocks.worldCupGroupTeam.createMany).toHaveBeenCalledWith({
      data: officialTeams.map((team, index) => ({
        challengeId: "c1",
        groupId: "group-a",
        teamId: team.id,
        seedOrder: index + 1,
      })),
      skipDuplicates: true,
    })
    expect(result.groups[0].teams.map((row) => row.team.name)).toEqual(["Mexico", "South Korea", "South Africa", "Czechia"])
  })

  it("rebuilds mixed imported production groups instead of preserving wrong rows and topping up with placeholders", async () => {
    const service = await import("@/lib/world-cup/worldCupGroupStageService")
    const groupE = { id: "group-e", challengeId: "c1", groupKey: "E", displayName: "Group E", sortOrder: 5, teams: [] }
    const officialTeams = [
      { id: "wc2026_official_ger", name: "Germany", country: "Germany", fifaCode: "GER", groupName: "E", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 1 } },
      { id: "wc2026_official_ecu", name: "Ecuador", country: "Ecuador", fifaCode: "ECU", groupName: "E", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 2 } },
      { id: "wc2026_official_civ", name: "Ivory Coast", country: "Ivory Coast", fifaCode: "CIV", groupName: "E", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 3 } },
      { id: "wc2026_official_cuw", name: "Curacao", country: "Curacao", fifaCode: "CUW", groupName: "E", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 4 } },
    ]
    const staleRows = [
      { id: "row-mex", teamId: "wc2026_official_mex", seedOrder: 1, team: { id: "wc2026_official_mex", name: "Mexico", country: "Mexico", fifaCode: "MEX", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups" } } },
      { id: "row-tun", teamId: "wc2026_official_tun", seedOrder: 2, team: { id: "wc2026_official_tun", name: "Tunisia", country: "Tunisia", fifaCode: "TUN", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups" } } },
      { id: "row-usa", teamId: "wc2026_official_usa", seedOrder: 3, team: { id: "wc2026_official_usa", name: "USA", country: "USA", fifaCode: "USA", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups" } } },
      { id: "row-tbd", teamId: "wc2026_placeholder_c1_E_4", seedOrder: 4, team: { id: "wc2026_placeholder_c1_E_4", name: "Group E Test Team 4", country: "TBD Group E", fifaCode: "E4", qualificationStatus: "test_placeholder", sourcePayload: { source: "allfantasy_test_placeholder" } } },
    ]

    prismaMocks.worldCupBracketChallenge.findUnique.mockResolvedValue({ id: "c1", sourcePayload: null })
    prismaMocks.worldCupGroup.findMany
      .mockResolvedValueOnce([groupE])
      .mockResolvedValueOnce([{
        ...groupE,
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
      }])
    prismaMocks.worldCupTeam.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(officialTeams)
    prismaMocks.worldCupGroupTeam.findMany.mockResolvedValue(staleRows)

    const result = await service.ensureWorldCupGroupsForChallenge("c1")

    expect(prismaMocks.worldCupTeam.upsert).not.toHaveBeenCalled()
    expect(prismaMocks.worldCupGroupTeam.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["row-mex", "row-tun", "row-usa", "row-tbd"] } },
    })
    expect(prismaMocks.worldCupGroupTeam.createMany).toHaveBeenCalledWith({
      data: officialTeams.map((team, index) => ({
        challengeId: "c1",
        groupId: "group-e",
        teamId: team.id,
        seedOrder: index + 1,
      })),
      skipDuplicates: true,
    })
    const names = result.groups[0].teams.map((row) => row.team.name)
    expect(names).toEqual(["Germany", "Ecuador", "Ivory Coast", "Curacao"])
    expect(names.join(" ")).not.toMatch(/TBD|Test Team|Mexico|Tunisia|USA/i)
  })

  it("does not let stale production test-mode flags bypass official group repair", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const service = await import("@/lib/world-cup/worldCupGroupStageService")
    const groupA = { id: "group-a", challengeId: "c1", groupKey: "A", displayName: "Group A", sortOrder: 1, teams: [] }
    const officialTeams = [
      { id: "wc2026_official_mex", name: "Mexico", country: "Mexico", fifaCode: "MEX", groupName: "A", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 1 } },
      { id: "wc2026_official_kor", name: "South Korea", country: "South Korea", fifaCode: "KOR", groupName: "A", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 2 } },
      { id: "wc2026_official_rsa", name: "South Africa", country: "South Africa", fifaCode: "RSA", groupName: "A", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 3 } },
      { id: "wc2026_official_cze", name: "Czechia", country: "Czechia", fifaCode: "CZE", groupName: "A", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 4 } },
    ]
    const staleRows = [
      { id: "row-arg", teamId: "demo_team_argentina", seedOrder: 1, team: { id: "demo_team_argentina", name: "Argentina", country: "Argentina", fifaCode: "ARG", qualificationStatus: "test", sourcePayload: { testFixture: true } } },
      { id: "row-aus", teamId: "demo_team_australia", seedOrder: 2, team: { id: "demo_team_australia", name: "Australia", country: "Australia", fifaCode: "AUS", qualificationStatus: "test", sourcePayload: { testFixture: true } } },
      { id: "row-bra", teamId: "demo_team_brazil", seedOrder: 3, team: { id: "demo_team_brazil", name: "Brazil", country: "Brazil", fifaCode: "BRA", qualificationStatus: "test", sourcePayload: { testFixture: true } } },
      { id: "row-tbd", teamId: "wc2026_placeholder_c1_A_4", seedOrder: 4, team: { id: "wc2026_placeholder_c1_A_4", name: "Group A Test Team 4", country: "TBD Group A", fifaCode: "A4", qualificationStatus: "test_placeholder", sourcePayload: { source: "allfantasy_test_placeholder" } } },
    ]

    prismaMocks.worldCupBracketChallenge.findUnique.mockResolvedValue({
      id: "c1",
      sourcePayload: {
        simulation: {
          isTestMode: true,
          testFixturesOnCreate: true,
          simulationEnabled: true,
        },
      },
    })
    prismaMocks.worldCupGroup.findMany
      .mockResolvedValueOnce([groupA])
      .mockResolvedValueOnce([{
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
      }])
    prismaMocks.worldCupTeam.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(officialTeams)
    prismaMocks.worldCupGroupTeam.findMany.mockResolvedValue(staleRows)

    const result = await service.ensureWorldCupGroupsForChallenge("c1")

    expect(prismaMocks.worldCupTeam.upsert).not.toHaveBeenCalled()
    expect(prismaMocks.worldCupGroupTeam.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["row-arg", "row-aus", "row-bra", "row-tbd"] } },
    })
    expect(result.groups[0].teams.map((row) => row.team.name)).toEqual(["Mexico", "South Korea", "South Africa", "Czechia"])
  })

  it("allows explicit production test group rendering only with a dedicated override", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const service = await import("@/lib/world-cup/worldCupGroupStageService")
    const groupA = { id: "group-a", challengeId: "c1", groupKey: "A", displayName: "Group A", sortOrder: 1, teams: [] }
    const testTeams = [
      { id: "wc2026_placeholder_c1_A_1", name: "Group A Test Team 1", country: "TBD Group A", fifaCode: "A1", groupName: "A", qualificationStatus: "test_placeholder", sourcePayload: { source: "allfantasy_test_placeholder", seedOrder: 1 } },
      { id: "wc2026_placeholder_c1_A_2", name: "Group A Test Team 2", country: "TBD Group A", fifaCode: "A2", groupName: "A", qualificationStatus: "test_placeholder", sourcePayload: { source: "allfantasy_test_placeholder", seedOrder: 2 } },
      { id: "wc2026_placeholder_c1_A_3", name: "Group A Test Team 3", country: "TBD Group A", fifaCode: "A3", groupName: "A", qualificationStatus: "test_placeholder", sourcePayload: { source: "allfantasy_test_placeholder", seedOrder: 3 } },
      { id: "wc2026_placeholder_c1_A_4", name: "Group A Test Team 4", country: "TBD Group A", fifaCode: "A4", groupName: "A", qualificationStatus: "test_placeholder", sourcePayload: { source: "allfantasy_test_placeholder", seedOrder: 4 } },
    ]

    prismaMocks.worldCupBracketChallenge.findUnique.mockResolvedValue({
      id: "c1",
      sourcePayload: { simulation: { isTestMode: true, allowProductionTestGroupData: true } },
    })
    prismaMocks.worldCupGroup.findMany
      .mockResolvedValueOnce([groupA])
      .mockResolvedValueOnce([{
        ...groupA,
        teams: testTeams.map((team, index) => ({
          id: `row-${team.id}`,
          teamId: team.id,
          seedOrder: index + 1,
          actualRank: null,
          points: null,
          goalDifference: null,
          goalsFor: null,
          team,
        })),
      }])
    prismaMocks.worldCupTeam.findMany.mockResolvedValue(testTeams)
    prismaMocks.worldCupGroupTeam.findMany.mockResolvedValue([])

    const result = await service.ensureWorldCupGroupsForChallenge("c1")

    expect(prismaMocks.worldCupTeam.create).not.toHaveBeenCalled()
    expect(prismaMocks.worldCupGroupTeam.createMany).toHaveBeenCalledWith({
      data: testTeams.map((team, index) => ({
        challengeId: "c1",
        groupId: "group-a",
        teamId: team.id,
        seedOrder: index + 1,
      })),
      skipDuplicates: true,
    })
    expect(result.groups[0].teams.map((row) => row.team.name)).toEqual([
      "Group A Test Team 1",
      "Group A Test Team 2",
      "Group A Test Team 3",
      "Group A Test Team 4",
    ])
  })

  it("filters stale saved picks out of the group-stage response after repair", async () => {
    const service = await import("@/lib/world-cup/worldCupGroupStageService")
    const groupA = { id: "group-a", challengeId: "c1", groupKey: "A", displayName: "Group A", sortOrder: 1, teams: [{ teamId: "demo_team_brazil" }] }
    const officialTeams = [
      { id: "wc2026_official_mex", name: "Mexico", country: "Mexico", fifaCode: "MEX", groupName: "A", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 1 } },
      { id: "wc2026_official_kor", name: "South Korea", country: "South Korea", fifaCode: "KOR", groupName: "A", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 2 } },
      { id: "wc2026_official_rsa", name: "South Africa", country: "South Africa", fifaCode: "RSA", groupName: "A", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 3 } },
      { id: "wc2026_official_cze", name: "Czechia", country: "Czechia", fifaCode: "CZE", groupName: "A", qualificationStatus: "qualified", sourcePayload: { source: "allfantasy_official_2026_groups", seedOrder: 4 } },
    ]
    const repairedGroup = {
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
    }

    prismaMocks.worldCupBracketEntry.findUnique.mockResolvedValue({
      id: "entry-1",
      challengeId: "c1",
      userId: "user-1",
      challenge: { ownerUserId: "owner-1", pickLockStrategy: null, pickLockAt: null, status: "open", sourcePayload: null, matches: [] },
    })
    prismaMocks.worldCupBracketChallenge.findUnique.mockResolvedValue({ id: "c1", sourcePayload: null })
    prismaMocks.worldCupGroup.findMany
      .mockResolvedValueOnce([groupA])
      .mockResolvedValueOnce([repairedGroup])
    prismaMocks.worldCupTeam.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(officialTeams)
    prismaMocks.worldCupGroupTeam.findMany.mockResolvedValue([])
    prismaMocks.worldCupGroupRankingPick.findMany.mockResolvedValue([
      { id: "stale-rank", groupId: "group-a", teamId: "demo_team_brazil", predictedRank: 1, actualRank: null, isCorrect: null, pointsAwarded: 0 },
      { id: "valid-rank", groupId: "group-a", teamId: "wc2026_official_mex", predictedRank: 1, actualRank: null, isCorrect: null, pointsAwarded: 0 },
    ])
    prismaMocks.worldCupThirdPlaceAdvancerPick.findMany.mockResolvedValue([
      { id: "stale-tp", groupId: "group-a", teamId: "wc2026_placeholder_c1_A_4", isSelected: true, actualAdvanced: null, isCorrect: null, pointsAwarded: 0 },
      { id: "valid-tp", groupId: "group-a", teamId: "wc2026_official_rsa", isSelected: true, actualAdvanced: null, isCorrect: null, pointsAwarded: 0 },
    ])

    const view = await service.getWorldCupGroupStageView({ challengeId: "c1", entryId: "entry-1", userId: "user-1" })

    expect(view.groups[0].teams.map((team) => team.name)).toEqual(["Mexico", "South Korea", "South Africa", "Czechia"])
    expect(view.groupRankingPicks.map((pick) => pick.teamId)).toEqual(["wc2026_official_mex"])
    expect(view.thirdPlaceAdvancerPicks.map((pick) => pick.teamId)).toEqual(["wc2026_official_rsa"])
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMocks = vi.hoisted(() => {
  const tx = {
    worldCupGroupTeam: { updateMany: vi.fn() },
    worldCupThirdPlaceAdvancerPick: { updateMany: vi.fn() },
    worldCupBracketSlot: { updateMany: vi.fn(async () => ({ count: 1 })) },
    worldCupBracketMatch: { updateMany: vi.fn(async () => ({ count: 1 })) },
  }
  return {
    tx,
    prisma: {
      $transaction: vi.fn(async (callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx)),
      worldCupGroup: { findFirst: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
      worldCupGroupTeam: { findMany: vi.fn() },
      worldCupThirdPlaceAdvancerPick: { updateMany: vi.fn() },
      worldCupBracketChallenge: { findUnique: vi.fn() },
      worldCupTeam: { findMany: vi.fn() },
    },
  }
})

const recalcMock = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMocks.prisma }))
vi.mock("@/lib/world-cup/worldCupScoringService", () => ({
  recalculateWorldCupChallenge: recalcMock,
}))

const groupTeams = Array.from({ length: 4 }, (_, index) => ({
  id: `row-${index + 1}`,
  teamId: `team-${index + 1}`,
  groupId: "g-A",
  seedOrder: index + 1,
  points: null,
  goalDifference: null,
  goalsFor: null,
  group: { id: "g-A", groupKey: "A", sortOrder: 1 },
  team: { id: `team-${index + 1}`, name: `Team ${index + 1}`, apiTeamId: index + 1, fifaCode: `T${index + 1}` },
}))

describe("worldCupGroupStageResultService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    recalcMock.mockResolvedValue([{ entryId: "e1", totalScore: 10 }])
    prismaMocks.prisma.worldCupGroup.findFirst.mockResolvedValue({
      id: "g-A",
      challengeId: "c1",
      teams: groupTeams,
    })
    prismaMocks.prisma.worldCupGroupTeam.findMany.mockResolvedValue(
      groupTeams.map((row) => ({ ...row, challengeId: "c1" }))
    )
    prismaMocks.prisma.worldCupBracketChallenge.findUnique.mockResolvedValue({ id: "c1" })
  })

  it("sets actual group standings", async () => {
    const { setWorldCupGroupActualStandings } = await import("@/lib/world-cup/worldCupGroupStageResultService")

    const result = await setWorldCupGroupActualStandings({
      challengeId: "c1",
      groupId: "g-A",
      orderedTeamIds: ["team-1", "team-2", "team-3", "team-4"],
      actorUserId: "admin-1",
    })

    expect(result.groupTeamsUpdated).toBe(4)
    expect(prismaMocks.tx.worldCupGroupTeam.updateMany).toHaveBeenCalledWith({
      where: { challengeId: "c1", groupId: "g-A", teamId: "team-1" },
      data: { actualRank: 1 },
    })
    expect(recalcMock).toHaveBeenCalledWith("c1")
  })

  it("rejects invalid group result order", async () => {
    const { setWorldCupGroupActualStandings } = await import("@/lib/world-cup/worldCupGroupStageResultService")

    await expect(
      setWorldCupGroupActualStandings({
        challengeId: "c1",
        groupId: "g-A",
        orderedTeamIds: ["team-1", "team-2", "team-2", "team-4"],
        actorUserId: "admin-1",
      })
    ).rejects.toThrow("duplicate")
  })

  it("requires exactly 8 actual third-place advancers", async () => {
    const { setWorldCupThirdPlaceActualAdvancers } = await import("@/lib/world-cup/worldCupGroupStageResultService")

    await expect(
      setWorldCupThirdPlaceActualAdvancers({
        challengeId: "c1",
        selectedTeamIds: ["team-1"],
        actorUserId: "admin-1",
      })
    ).rejects.toThrow("exactly 8")
  })

  it("sets third-place actual advancers and recalculates", async () => {
    const { setWorldCupThirdPlaceActualAdvancers } = await import("@/lib/world-cup/worldCupGroupStageResultService")
    prismaMocks.prisma.worldCupGroupTeam.findMany.mockResolvedValue(
      Array.from({ length: 8 }, (_, index) => ({
        teamId: `team-${index + 1}`,
        groupId: `g-${index + 1}`,
        group: { id: `g-${index + 1}`, groupKey: String(index + 1), sortOrder: index + 1 },
        team: { id: `team-${index + 1}` },
      }))
    )

    const result = await setWorldCupThirdPlaceActualAdvancers({
      challengeId: "c1",
      selectedTeamIds: Array.from({ length: 8 }, (_, index) => `team-${index + 1}`),
      actorUserId: "admin-1",
    })

    expect(result.thirdPlaceTeamsUpdated).toBe(8)
    expect(prismaMocks.tx.worldCupThirdPlaceAdvancerPick.updateMany).toHaveBeenCalledWith({
      where: { challengeId: "c1", teamId: { in: Array.from({ length: 8 }, (_, index) => `team-${index + 1}`) } },
      data: { actualAdvanced: true },
    })
    expect(recalcMock).toHaveBeenCalledWith("c1")
  })

  it("loads deterministic test group results and recalculates leaderboard", async () => {
    const { loadWorldCupTestGroupResults } = await import("@/lib/world-cup/worldCupGroupStageResultService")
    const groups = Array.from({ length: 12 }, (_, groupIndex) => ({
      id: `g-${groupIndex + 1}`,
      groupKey: String.fromCharCode(65 + groupIndex),
      displayName: `Group ${String.fromCharCode(65 + groupIndex)}`,
      sortOrder: groupIndex + 1,
      teams: Array.from({ length: 4 }, (_, teamIndex) => ({
        id: `row-${groupIndex}-${teamIndex}`,
        teamId: `team-${groupIndex}-${teamIndex}`,
        seedOrder: teamIndex + 1,
      })),
    }))
    prismaMocks.prisma.worldCupGroup.findMany
      .mockResolvedValueOnce(groups.map((group) => ({ ...group, teams: group.teams.map((team) => ({ teamId: team.teamId })) })))
      .mockResolvedValueOnce(groups)
    prismaMocks.prisma.worldCupTeam.findMany.mockResolvedValue([])

    const result = await loadWorldCupTestGroupResults({ challengeId: "c1", actorUserId: "admin-1" })

    expect(result.groupsUpdated).toBe(12)
    expect(result.thirdPlaceTeamsUpdated).toBe(8)
    expect(recalcMock).toHaveBeenCalledWith("c1")
  })

  it("applies provider standings to actualRank and recalculates", async () => {
    const { applyWorldCupProviderGroupStandings } = await import("@/lib/world-cup/worldCupGroupStageResultService")
    prismaMocks.prisma.worldCupGroupTeam.findMany
      .mockResolvedValueOnce(groupTeams.map((row) => ({ ...row, challengeId: "c1" })))
      .mockResolvedValueOnce([])

    const result = await applyWorldCupProviderGroupStandings({
      challengeId: "c1",
      standings: [
        { groupName: "A", providerId: "2", teamName: "Team 2", points: 9, goalDifference: 5, goalsFor: 7 },
        { groupName: "A", providerId: "1", teamName: "Team 1", points: 6, goalDifference: 2, goalsFor: 5 },
        { groupName: "A", providerId: "3", teamName: "Team 3", points: 3, goalDifference: -1, goalsFor: 3 },
        { groupName: "A", providerId: "4", teamName: "Team 4", points: 0, goalDifference: -6, goalsFor: 1 },
      ],
      actorUserId: "admin-1",
    })

    expect(result.groupTeamsUpdated).toBe(4)
    expect(prismaMocks.tx.worldCupGroupTeam.updateMany).toHaveBeenCalledWith({
      where: { challengeId: "c1", groupId: "g-A", teamId: "team-2" },
      data: { actualRank: 1, points: 9, goalDifference: 5, goalsFor: 7 },
    })
    expect(recalcMock).toHaveBeenCalledWith("c1")
  })

  it("derives exactly 8 third-place actual advancers from standings", async () => {
    const { deriveWorldCupThirdPlaceActualAdvancers } = await import("@/lib/world-cup/worldCupGroupStageResultService")
    const rows = Array.from({ length: 12 }, (_, groupIndex) =>
      Array.from({ length: 4 }, (_, teamIndex) => ({
        teamId: `team-${groupIndex}-${teamIndex}`,
        groupId: `g-${groupIndex}`,
        seedOrder: teamIndex + 1,
        points: teamIndex === 0 ? 20 : teamIndex === 1 ? 16 : teamIndex === 2 ? 12 - groupIndex : 0,
        goalDifference: teamIndex === 0 ? 10 : teamIndex === 1 ? 8 : teamIndex === 2 ? 12 - groupIndex : -8,
        goalsFor: teamIndex === 0 ? 8 : teamIndex === 1 ? 7 : teamIndex === 2 ? 6 : 1,
        group: { id: `g-${groupIndex}`, groupKey: String.fromCharCode(65 + groupIndex), sortOrder: groupIndex + 1 },
        team: { id: `team-${groupIndex}-${teamIndex}`, name: `Team ${groupIndex}-${teamIndex}`, apiTeamId: groupIndex * 10 + teamIndex, fifaCode: null },
      }))
    ).flat()
    prismaMocks.prisma.worldCupGroupTeam.findMany.mockResolvedValue(rows)

    const result = await deriveWorldCupThirdPlaceActualAdvancers({ challengeId: "c1", actorUserId: "admin-1" })

    expect(result.thirdPlaceTeamsUpdated).toBe(8)
    expect(prismaMocks.tx.worldCupThirdPlaceAdvancerPick.updateMany).toHaveBeenCalledWith({
      where: {
        challengeId: "c1",
        teamId: { in: expect.arrayContaining(Array.from({ length: 8 }, (_, index) => `team-${index}-2`)) },
      },
      data: { actualAdvanced: true },
    })
  })

  it("refuses to populate Round of 32 without confirmed best-third mapping", async () => {
    const { populateWorldCupRoundOf32FromGroupResults } = await import("@/lib/world-cup/worldCupGroupStageResultService")

    await expect(
      populateWorldCupRoundOf32FromGroupResults({ challengeId: "c1" })
    ).rejects.toThrow("best-third Round of 32 mapping is not confirmed")
  })
})

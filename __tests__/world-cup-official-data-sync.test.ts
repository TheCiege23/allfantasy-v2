import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getWorldCupDataProvider: vi.fn(),
  recalculateWorldCupChallenge: vi.fn(),
  emitWorldCupMatchTransitionEvents: vi.fn(),
  prisma: {
    worldCupTeam: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    worldCupOfficialFixture: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    worldCupBracketChallenge: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    worldCupBracketMatch: {
      update: vi.fn(),
    },
    worldCupOfficialGroupStanding: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))
vi.mock("@/lib/world-cup/worldCupDataProvider", async () => {
  const actual = await vi.importActual<typeof import("@/lib/world-cup/worldCupDataProvider")>(
    "@/lib/world-cup/worldCupDataProvider"
  )
  return {
    ...actual,
    getWorldCupDataProvider: mocks.getWorldCupDataProvider,
  }
})
vi.mock("@/lib/world-cup/worldCupScoringService", () => ({
  recalculateWorldCupChallenge: mocks.recalculateWorldCupChallenge,
}))
vi.mock("@/lib/world-cup/worldCupBracketLiveEventHooks", () => ({
  emitWorldCupMatchTransitionEvents: mocks.emitWorldCupMatchTransitionEvents,
}))

const groupFixture = {
  providerId: "g1",
  homeProviderId: "1",
  awayProviderId: "2",
  homeName: "A",
  awayName: "B",
  startsAt: "2026-06-11T19:00:00Z",
  roundName: "Group Stage - 1",
  stage: "Group Stage - 1",
  groupName: "A",
  status: "scheduled",
}

const knockoutFixture = {
  providerId: "1489001",
  homeProviderId: "3",
  awayProviderId: "4",
  homeName: "C",
  awayName: "D",
  startsAt: "2026-07-01T19:00:00Z",
  roundName: "Round of 32",
  stage: "Round of 32",
  status: "scheduled",
}

describe("World Cup official data sync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.prisma.worldCupTeam.findUnique.mockResolvedValue(null)
    mocks.prisma.worldCupTeam.findFirst.mockImplementation(async ({ where }: any) => ({
      id: `team-${where.name?.equals ?? where.fifaCode ?? "unknown"}`,
    }))
    mocks.prisma.worldCupTeam.upsert.mockImplementation(async ({ create }: any) => ({
      id: `team-${create.apiTeamId}`,
    }))
    mocks.prisma.worldCupOfficialFixture.findUnique.mockResolvedValue(null)
    mocks.prisma.worldCupOfficialFixture.upsert.mockImplementation(async ({ create }: any) => ({
      id: `fixture-${create.providerFixtureId}`,
    }))
    mocks.prisma.worldCupBracketChallenge.findMany.mockResolvedValue([{ id: "challenge-1" }])
    mocks.prisma.worldCupBracketChallenge.findUnique.mockResolvedValue({
      id: "challenge-1",
      pickLockAt: null,
      matches: [
        {
          id: "m1",
          apiFixtureId: null,
          round: "round_of_32",
          roundIndex: 1,
          matchNumber: 1,
          homeTeamId: null,
          awayTeamId: null,
        },
      ],
    })
    mocks.prisma.worldCupBracketChallenge.update.mockResolvedValue({})
    mocks.prisma.worldCupBracketMatch.update.mockResolvedValue({ id: "m1" })
    mocks.prisma.worldCupOfficialGroupStanding.findUnique.mockResolvedValue(null)
    mocks.prisma.worldCupOfficialGroupStanding.upsert.mockResolvedValue({})
    mocks.prisma.worldCupOfficialGroupStanding.updateMany.mockResolvedValue({ count: 0 })
  })

  it("stores group-stage provider fixtures without forcing them into bracket matches", async () => {
    mocks.getWorldCupDataProvider.mockResolvedValue({ getFixtures: vi.fn(async () => [groupFixture]) })
    const { syncWorldCupFixtures } = await import("@/lib/world-cup/worldCupDataSyncService")

    const result = await syncWorldCupFixtures({ provider: "apifootball", seasonYear: 2026 })

    expect(result.officialFixturesCreated).toBe(1)
    expect(result.bracketMatchesUpdated).toBe(0)
    expect(mocks.prisma.worldCupOfficialFixture.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          providerName: "apifootball",
          providerFixtureId: "g1",
          groupName: "A",
          stage: "Group Stage - 1",
        }),
      })
    )
    expect(mocks.prisma.worldCupBracketMatch.update).not.toHaveBeenCalled()
  })

  it("updates a bracket match for knockout fixtures when provider round/index aligns", async () => {
    mocks.getWorldCupDataProvider.mockResolvedValue({ getFixtures: vi.fn(async () => [knockoutFixture]) })
    const { syncWorldCupFixtures } = await import("@/lib/world-cup/worldCupDataSyncService")

    const result = await syncWorldCupFixtures({ provider: "apifootball", seasonYear: 2026 })

    expect(result.officialFixturesCreated).toBe(1)
    expect(result.bracketMatchesUpdated).toBe(1)
    expect(mocks.prisma.worldCupBracketMatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "m1" },
        data: expect.objectContaining({ apiFixtureId: 1489001, startsAt: new Date("2026-07-01T19:00:00Z") }),
      })
    )
  })

  it("returns a structured warning when provider standings are unavailable", async () => {
    mocks.getWorldCupDataProvider.mockResolvedValue({ getGroupStandings: vi.fn(async () => []) })
    const { syncWorldCupProviderGroupStandings } = await import("@/lib/world-cup/worldCupDataSyncService")

    const result = await syncWorldCupProviderGroupStandings({
      challengeId: "challenge-1",
      provider: "apifootball",
      seasonYear: 2026,
    })

    expect(result.updated).toBe(0)
    expect(result.warnings.join(" ")).toContain("standings_not_available_yet")
  })

  it("ingests group standings and derives exactly eight third-place advancers", async () => {
    const standings = Array.from({ length: 12 }).flatMap((_, groupIndex) => {
      const groupName = String.fromCharCode("A".charCodeAt(0) + groupIndex)
      return [1, 2, 3, 4].map((rank) => ({
        providerTeamId: `${groupName}-${rank}`,
        teamName: `${groupName}${rank}`,
        groupName,
        rank,
        points: rank === 1 ? 30 : rank === 2 ? 24 : rank === 3 ? 20 - groupIndex : 1,
        goalDifference: rank === 1 ? 12 : rank === 2 ? 10 : rank === 3 ? 10 - groupIndex : -10,
        goalsFor: rank === 1 ? 15 : rank === 2 ? 12 : rank === 3 ? 20 - groupIndex : 1,
        goalsAgainst: rank,
        played: 3,
        wins: rank <= 2 ? 2 : 1,
        draws: 0,
        losses: rank >= 3 ? 2 : 1,
      }))
    })
    mocks.getWorldCupDataProvider.mockResolvedValue({ getGroupStandings: vi.fn(async () => standings) })
    mocks.prisma.worldCupTeam.findFirst.mockImplementation(async ({ where }: any) => ({
      id: `team-${where.name?.equals}`,
    }))
    const { syncWorldCupProviderGroupStandings } = await import("@/lib/world-cup/worldCupDataSyncService")

    const result = await syncWorldCupProviderGroupStandings({
      challengeId: "challenge-1",
      provider: "apifootball",
      seasonYear: 2026,
    })

    expect(result.groupsComplete).toBe(true)
    expect(result.created).toBe(48)
    expect(result.thirdPlaceAdvancers).toHaveLength(8)
    expect(result.thirdPlaceAdvancers.map((row) => row.groupName)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
    ])
    expect(mocks.prisma.worldCupOfficialGroupStanding.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          actualRank: 1,
          points: 30,
          goalDifference: 12,
          goalsFor: 15,
        }),
      })
    )
    expect(mocks.prisma.worldCupOfficialGroupStanding.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teamId: { in: expect.arrayContaining(["team-A3"]) },
        }),
        data: { isThirdPlaceAdvancer: true },
      })
    )
  })
})

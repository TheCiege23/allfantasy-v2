import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMocks = vi.hoisted(() => ({
  challengeFindUnique: vi.fn(),
  appUserFindUnique: vi.fn(),
  scoringCreate: vi.fn(),
  challengeCreate: vi.fn(),
  slotCreateMany: vi.fn(),
  matchCreateMany: vi.fn(),
  participantCreate: vi.fn(),
  entryCreate: vi.fn(),
  entryFindFirst: vi.fn(),
  inviteCreate: vi.fn(),
  transaction: vi.fn(),
}))

const loadTestFixturesMock = vi.hoisted(() => vi.fn())
const lifecycleMocks = vi.hoisted(() => ({
  challengeCreated: vi.fn(),
  bracketCompleted: vi.fn(),
  entryCreated: vi.fn(),
  userJoined: vi.fn(),
}))

vi.mock("@/lib/adminAuth", () => ({
  isAdminEmailAllowed: vi.fn(() => false),
}))

vi.mock("@/lib/bracket-brain/bracketBrainAccess", () => ({
  userHasBracketBrainAi: vi.fn(async () => false),
}))

vi.mock("@/lib/world-cup/worldCupScoringService", () => ({
  buildWorldCupLeaderboardRows: vi.fn(() => []),
  isWorldCupEntryCompleteFromSelections: vi.fn(() => false),
  recalculateWorldCupChallenge: vi.fn(async () => []),
}))

vi.mock("@/lib/world-cup/worldCupBracketEventService", () => ({
  ensureWorldCupCommissionerSettings: vi.fn(async () => null),
}))

vi.mock("@/lib/world-cup/worldCupBracketLifecycleEvents", () => ({
  emitWorldCupChallengeCreated: lifecycleMocks.challengeCreated,
  emitWorldCupBracketCompleted: lifecycleMocks.bracketCompleted,
  emitWorldCupEntryCreated: lifecycleMocks.entryCreated,
  emitWorldCupUserJoined: lifecycleMocks.userJoined,
}))

vi.mock("@/lib/world-cup/worldCupBracketSettingsService", () => ({
  getWorldCupJoinPasswordHashFromPayload: vi.fn(() => null),
  hashWorldCupJoinPassword: vi.fn(async () => "hash"),
  parseWorldCupLeagueSettings: vi.fn(() => ({ allowLateJoin: false })),
}))

vi.mock("@/lib/world-cup/worldCupSimulationService", () => ({
  loadWorldCupTestFixtures: loadTestFixturesMock,
}))

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      $transaction: prismaMocks.transaction,
      worldCupBracketChallenge: {
        findUnique: prismaMocks.challengeFindUnique,
      },
      appUser: {
        findUnique: prismaMocks.appUserFindUnique,
      },
      worldCupBracketEntry: {
        findFirst: prismaMocks.entryFindFirst,
      },
    },
  }
})

import { createWorldCupBracketChallenge } from "@/lib/world-cup/worldCupBracketService"

const fixtureSeedResult = {
  success: true,
  teamsCreated: 32,
  teamsUpdated: 0,
  matchesUpdated: 16,
  pickableMatchesAfter: 16,
  totalMatchesAfter: 31,
  unresolvedMatchesAfter: 15,
  warnings: [],
}

describe("World Cup bracket creation fixture readiness", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMocks.challengeFindUnique.mockResolvedValue(null)
    prismaMocks.scoringCreate.mockResolvedValue({ id: "scoring-1" })
    prismaMocks.challengeCreate.mockResolvedValue({
      id: "challenge-1",
      name: "World Cup",
      ownerUserId: "user-1",
    })
    prismaMocks.participantCreate.mockResolvedValue({ id: "participant-1" })
    prismaMocks.entryCreate.mockResolvedValue({ id: "entry-1", name: "Bracket 1" })
    prismaMocks.entryFindFirst.mockResolvedValue({ id: "entry-1", name: "Bracket 1" })
    prismaMocks.transaction.mockImplementation(async (callback) =>
      callback({
        worldCupBracketScoringProfile: { create: prismaMocks.scoringCreate },
        worldCupBracketChallenge: { create: prismaMocks.challengeCreate },
        worldCupBracketSlot: { createMany: prismaMocks.slotCreateMany },
        worldCupBracketMatch: { createMany: prismaMocks.matchCreateMany },
        worldCupBracketParticipant: { create: prismaMocks.participantCreate },
        worldCupBracketEntry: { create: prismaMocks.entryCreate },
        worldCupBracketInvite: { create: prismaMocks.inviteCreate },
      })
    )
    loadTestFixturesMock.mockResolvedValue(fixtureSeedResult)
  })

  it("creates the unresolved bracket template and seeds mock fixtures in test mode", async () => {
    const result = await createWorldCupBracketChallenge({
      user: { id: "user-1", name: "Owner" },
      name: "World Cup",
      isTestMode: true,
      seedTestFixtures: true,
    })

    const matchRows = prismaMocks.matchCreateMany.mock.calls[0]?.[0]?.data ?? []
    expect(matchRows).toHaveLength(31)
    expect(matchRows[0]).toMatchObject({
      challengeId: "challenge-1",
      round: "round_of_32",
      matchNumber: 1,
      homeSlotKey: "A1",
      awaySlotKey: "B2",
      homeTeamName: "Group A Winner",
      awayTeamName: "Group B Runner-up",
    })
    expect(loadTestFixturesMock).toHaveBeenCalledWith("challenge-1", {
      dryRun: false,
    })
    expect(prismaMocks.challengeCreate.mock.calls[0]?.[0]?.data.sourcePayload).toMatchObject({
      simulation: {
        isTestMode: true,
        testFixturesOnCreate: true,
        fixtureTemplate: "mock_round_of_32",
      },
    })
    expect(result.fixturesSeeded).toBe(true)
  })

  it("creates unresolved slot fixtures without mock teams when test mode is off", async () => {
    await createWorldCupBracketChallenge({
      user: { id: "user-1", name: "Owner" },
      name: "World Cup",
    })

    expect(prismaMocks.matchCreateMany.mock.calls[0]?.[0]?.data).toHaveLength(31)
    expect(loadTestFixturesMock).not.toHaveBeenCalled()
    expect(prismaMocks.challengeCreate.mock.calls[0]?.[0]?.data.sourcePayload).toBeUndefined()
  })
})

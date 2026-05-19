import { beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const prismaMocks = vi.hoisted(() => ({
  worldCupBracketChallenge: {
    findUnique: vi.fn(),
  },
  worldCupBracketEntry: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  worldCupGroup: {
    createMany: vi.fn(),
    findMany: vi.fn(),
  },
  worldCupGroupTeam: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  worldCupTeam: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  worldCupGroupRankingPick: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  worldCupThirdPlaceAdvancerPick: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  worldCupBracketPick: {
    deleteMany: vi.fn(),
  },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({
  prisma: prismaMocks,
}))

describe("World Cup finalize route service imports", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMocks.worldCupBracketChallenge.findUnique.mockResolvedValue({
      id: "c1",
      sourcePayload: { isTestMode: true },
    })
    prismaMocks.worldCupGroup.createMany.mockResolvedValue({ count: 0 })
    prismaMocks.worldCupGroupTeam.findMany.mockResolvedValue([])
    prismaMocks.worldCupGroupTeam.createMany.mockResolvedValue({ count: 0 })
    prismaMocks.worldCupGroupTeam.deleteMany.mockResolvedValue({ count: 0 })
    prismaMocks.worldCupTeam.findMany.mockResolvedValue([])
    prismaMocks.worldCupTeam.findFirst.mockResolvedValue(null)
    prismaMocks.worldCupTeam.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => data)
    prismaMocks.worldCupTeam.upsert.mockImplementation(async ({ create }: { create: Record<string, unknown> }) => create)
    prismaMocks.worldCupTeam.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({ id: where.id, ...data }))
    prismaMocks.worldCupGroupRankingPick.findMany.mockResolvedValue([])
    prismaMocks.worldCupGroupRankingPick.deleteMany.mockResolvedValue({ count: 0 })
    prismaMocks.worldCupThirdPlaceAdvancerPick.findMany.mockResolvedValue([])
    prismaMocks.worldCupThirdPlaceAdvancerPick.deleteMany.mockResolvedValue({ count: 0 })
    prismaMocks.worldCupBracketPick.deleteMany.mockResolvedValue({ count: 0 })
  })

  it("imports finalize/review services directly instead of the world-cup barrel", () => {
    const source = readFileSync(
      join(process.cwd(), "app/api/brackets/world-cup/[challengeId]/entries/[entryId]/finalize/route.ts"),
      "utf8"
    )

    expect(source).toContain("@/lib/world-cup/worldCupEntryFinalizeService")
    expect(source).toContain("@/lib/world-cup/worldCupBracketService")
    expect(source).not.toContain('} from "@/lib/world-cup"')
  })

  it("exposes callable finalize review service functions", async () => {
    const service = await import("@/lib/world-cup/worldCupEntryFinalizeService")

    expect(service.getWorldCupEntryCompletionReview).toEqual(expect.any(Function))
    expect(service.finalizeWorldCupEntry).toEqual(expect.any(Function))
  })

  it("completion review counts generated knockout matchups from group predictions", async () => {
    const service = await import("@/lib/world-cup/worldCupEntryFinalizeService")
    const groupKeys = "ABCDEFGHIJKL".split("")
    const challengeGroups = groupKeys.map((groupKey, groupIndex) => ({
      id: `group-${groupKey.toLowerCase()}`,
      groupKey,
      displayName: `Group ${groupKey}`,
      sortOrder: groupIndex + 1,
      teams: Array.from({ length: 4 }, (_, teamIndex) => {
        const rank = teamIndex + 1
        const team = {
          id: `row-${groupKey.toLowerCase()}${rank}`,
          teamId: `team-${groupKey.toLowerCase()}${rank}`,
          name: `${groupKey} Team ${rank}`,
          country: `${groupKey} Country ${rank}`,
          fifaCode: `${groupKey}${rank}T`,
          flagUrl: null,
          logoUrl: null,
          seedOrder: rank,
          actualRank: null,
          points: null,
          goalDifference: null,
          goalsFor: null,
        }
        return {
          id: team.id,
          teamId: team.teamId,
          seedOrder: rank,
          actualRank: null,
          points: null,
          goalDifference: null,
          goalsFor: null,
          team,
        }
      }),
    }))
    const allRows = challengeGroups.flatMap((group) => group.teams)
    const rankingPicks = challengeGroups.flatMap((group) =>
      group.teams.map((row, index) => ({
        id: `rank-${row.teamId}`,
        groupId: group.id,
        teamId: row.teamId,
        predictedRank: index + 1,
        actualRank: null,
        isCorrect: null,
        pointsAwarded: 0,
      }))
    )
    const thirdPlacePicks = challengeGroups.slice(0, 8).map((group) => ({
      id: `third-${group.groupKey}`,
      groupId: group.id,
      teamId: group.teams[2].teamId,
      isSelected: true,
      actualAdvanced: null,
      isCorrect: null,
      pointsAwarded: 0,
    }))
    prismaMocks.worldCupGroup.findMany
      .mockResolvedValueOnce(challengeGroups.map((group) => ({
        id: group.id,
        groupKey: group.groupKey,
        displayName: group.displayName,
        sortOrder: group.sortOrder,
        teams: group.teams.map((team) => ({ teamId: team.teamId })),
      })))
      .mockResolvedValueOnce(challengeGroups)
    prismaMocks.worldCupTeam.findMany.mockResolvedValue(allRows.map((row) => ({
      id: row.teamId,
      name: row.team.name,
      country: row.team.country,
      fifaCode: row.team.fifaCode,
      groupName: row.teamId.slice(5, 6).toUpperCase(),
      qualificationStatus: "test_placeholder",
      sourcePayload: { source: "test" },
    })))
    prismaMocks.worldCupGroupRankingPick.findMany.mockResolvedValue(rankingPicks)
    prismaMocks.worldCupThirdPlaceAdvancerPick.findMany.mockResolvedValue(thirdPlacePicks)
    prismaMocks.worldCupBracketEntry.findUnique.mockResolvedValue({
      id: "entry-1",
      challengeId: "c1",
      userId: "user-1",
      submittedAt: new Date("2026-05-19T04:00:00.000Z"),
      isComplete: true,
      challenge: {
        id: "c1",
        ownerUserId: "owner-1",
        pickLockStrategy: null,
        pickLockAt: null,
        status: "open",
        includeThirdPlace: false,
        groups: challengeGroups,
        matches: [{
          id: "m1",
          apiFixtureId: null,
          round: "round_of_32",
          roundIndex: 1,
          matchNumber: 1,
          homeSlotKey: "A1",
          awaySlotKey: "B2",
          homeTeamId: null,
          awayTeamId: null,
          homeTeamName: "Group A Winner",
          awayTeamName: "Group B Runner-up",
          homeTeamLogo: null,
          awayTeamLogo: null,
          homeScore: null,
          awayScore: null,
          homePenaltyScore: null,
          awayPenaltyScore: null,
          status: "scheduled",
          startsAt: null,
          winnerTeamId: null,
          winnerTeamName: null,
          nextMatchId: null,
          nextMatchSlot: null,
          elapsedMinute: null,
          injuryTime: null,
          period: null,
          venueName: null,
          venueCity: null,
          apiStatusShort: null,
          lastScoreSyncedAt: null,
        }],
      },
      picks: [{ id: "pick-m1", matchId: "m1", round: "round_of_32", selectedTeamId: "team-a1", selectedSlotKey: "A1", selectedTeamName: "A Team 1" }],
      groupRankingPicks: rankingPicks,
      thirdPlaceAdvancerPicks: thirdPlacePicks,
    })

    const review = await service.getWorldCupEntryCompletionReview({
      challengeId: "c1",
      entryId: "entry-1",
      userId: "user-1",
    })

    expect(review.knockoutComplete).toBe(true)
    expect(review.fullEntryComplete).toBe(true)
    expect(review.isComplete).toBe(true)
    expect(review.submittedAt).toBe("2026-05-19T04:00:00.000Z")
    expect(review.requiredKnockoutPicks).toBe(1)
    expect(review.completedKnockoutPicks).toBe(1)
    expect(review.missingKnockoutPicks).toBe(0)
  })

  it("reports stale finalized entries as needing refinalize when picks become incomplete", async () => {
    const service = await import("@/lib/world-cup/worldCupEntryFinalizeService")
    const challengeGroups = "ABCDEFGHIJKL".split("").map((groupKey, groupIndex) => ({
      id: `group-${groupKey.toLowerCase()}`,
      groupKey,
      displayName: `Group ${groupKey}`,
      sortOrder: groupIndex + 1,
      teams: [],
    }))
    prismaMocks.worldCupGroup.findMany
      .mockResolvedValueOnce(challengeGroups)
      .mockResolvedValueOnce(challengeGroups)
    prismaMocks.worldCupBracketEntry.findUnique.mockResolvedValue({
      id: "entry-1",
      challengeId: "c1",
      userId: "user-1",
      submittedAt: new Date("2026-05-19T04:00:00.000Z"),
      isComplete: true,
      challenge: {
        id: "c1",
        ownerUserId: "owner-1",
        pickLockStrategy: null,
        pickLockAt: null,
        status: "open",
        includeThirdPlace: false,
        groups: challengeGroups,
        matches: [{
          id: "m1",
          round: "round_of_32",
          roundIndex: 1,
          matchNumber: 1,
          homeSlotKey: "A1",
          awaySlotKey: "B2",
          homeTeamId: null,
          awayTeamId: null,
          homeTeamName: "Group A Winner",
          awayTeamName: "Group B Runner-up",
          status: "scheduled",
          startsAt: null,
          winnerTeamId: null,
          winnerTeamName: null,
          nextMatchId: null,
          nextMatchSlot: null,
        }],
      },
      picks: [],
      groupRankingPicks: [],
      thirdPlaceAdvancerPicks: [],
    })

    const review = await service.getWorldCupEntryCompletionReview({
      challengeId: "c1",
      entryId: "entry-1",
      userId: "user-1",
    })

    expect(review.fullEntryComplete).toBe(false)
    expect(review.staleSubmittedIncomplete).toBe(true)
    expect(review.needsRefinalize).toBe(true)
    expect(review.submittedAt).toBeNull()
  })

  it("entry pick saves validate against generated group-prediction matchups", () => {
    const source = readFileSync(join(process.cwd(), "lib/world-cup/worldCupBracketService.ts"), "utf8")

    expect(source).toContain('knockoutMode === "predictive"')
    expect(source).toContain("getWorldCupGroupStageView({")
    expect(source).toContain("buildWorldCupMatchesFromGroupPredictions({")
    expect(source).toContain("buildWorldCupProjectedMatches(")
    expect(source).toContain("groupSeededMatches")
  })
})

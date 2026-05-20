import { describe, expect, it } from "vitest"
import {
  buildWorldCupPathToWinInsight,
  calculateWorldCupBracketGrade,
  calculateWorldCupLeaderboardAiInsights,
} from "@/lib/world-cup/worldCupAiSubscriptionInsights"

const match = {
  id: "m1",
  apiFixtureId: null,
  round: "round_of_32" as const,
  roundIndex: 1,
  matchNumber: 1,
  homeSlotKey: "A1",
  awaySlotKey: "B2",
  homeTeamId: "brazil",
  awayTeamId: "canada",
  homeTeamName: "Brazil",
  awayTeamName: "Canada",
  homeTeamLogo: null,
  awayTeamLogo: null,
  homeScore: null,
  awayScore: null,
  homePenaltyScore: null,
  awayPenaltyScore: null,
  status: "scheduled" as const,
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
}

const baseCompletion = {
  challengeId: "c1",
  entryId: "e1",
  groupStageComplete: false,
  knockoutComplete: false,
  fullEntryComplete: false,
  groupsRankedCount: 6,
  missingGroups: ["A"],
  thirdPlaceSelectedCount: 3,
  missingKnockoutPicks: 2,
  requiredKnockoutPicks: 4,
  completedKnockoutPicks: 2,
  isLocked: false,
  isComplete: false,
  submittedAt: null,
}

describe("World Cup AI subscription insights", () => {
  it("returns a completion-focused basic bracket grade for incomplete entries", () => {
    const grade = calculateWorldCupBracketGrade({
      completionReview: baseCompletion,
      entry: { championTeamId: null, championTeamName: null },
      matches: [match],
      picks: [],
    })

    expect(grade.completionPercent).toBeGreaterThan(0)
    expect(grade.grade).toBe("Needs Picks")
    expect(grade.championSelected).toBe(false)
    expect(grade.recommendation).toMatch(/third-place|knockout|group/i)
  })

  it("returns full risk and champion confidence details for complete entries", () => {
    const grade = calculateWorldCupBracketGrade({
      completionReview: {
        ...baseCompletion,
        groupStageComplete: true,
        knockoutComplete: true,
        fullEntryComplete: true,
        groupsRankedCount: 12,
        thirdPlaceSelectedCount: 8,
        missingKnockoutPicks: 0,
        completedKnockoutPicks: 4,
        isComplete: true,
        submittedAt: "2026-06-01T00:00:00.000Z",
      },
      entry: { championTeamId: "brazil", championTeamName: "Brazil", submittedAt: "2026-06-01T00:00:00.000Z" },
      matches: [match],
      picks: [{
        id: "p1",
        matchId: "m1",
        matchNumber: 1,
        round: "final",
        selectedTeamId: "brazil",
        selectedSlotKey: "A1",
        selectedTeamName: "Brazil",
        pointsAwarded: 0,
        isCorrect: null,
        lockedAt: null,
      }],
    })

    expect(grade.grade).toMatch(/^A/)
    expect(grade.riskLabel).toBe("Low")
    expect(grade.championConfidence).toBeGreaterThan(50)
    expect(grade.biggestRisk).toMatch(/chalk|leverage|path/i)
  })

  it("adds AI win probability and health to finalized leaderboard rows without unfinalized data", () => {
    const insights = calculateWorldCupLeaderboardAiInsights([
      {
        rank: 1,
        entryId: "final-1",
        entryName: "Finalized 1",
        participantId: "p1",
        userId: "u1",
        username: null,
        avatarUrl: null,
        displayName: "User 1",
        totalScore: 0,
        maxPossibleScore: 480,
        correctPicks: 0,
        incorrectPicks: 0,
        championPickName: "Brazil",
        championTeamId: "brazil",
        championStillAlive: true,
        roundBreakdown: {},
        joinedAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ])

    expect(insights).toHaveLength(1)
    expect(insights[0]).toMatchObject({ entryId: "final-1", championAlive: true })
    expect(insights[0].aiWinProbability).toBeGreaterThan(0)
  })

  it("returns a locked path-to-win teaser for non-Pro users", () => {
    const insight = buildWorldCupPathToWinInsight({
      selectedEntry: { id: "e1", name: "Mine", championTeamId: null, submittedAt: null },
      leaderboard: [],
      hasBracketBrainAi: false,
    })

    expect(insight.locked).toBe(true)
    expect(insight.lines.join(" ")).toMatch(/AF Pro can show your path to win/i)
  })

  it("uses only the current finalized entry and public leaderboard rows for path to win", () => {
    const insight = buildWorldCupPathToWinInsight({
      selectedEntry: {
        id: "e2",
        name: "Mine",
        championTeamId: "brazil",
        championTeamName: "Brazil",
        totalScore: 10,
        maxPossibleScore: 500,
        submittedAt: "2026-06-01T00:00:00.000Z",
      },
      leaderboard: [
        {
          rank: 1,
          entryId: "leader",
          entryName: "Leader",
          participantId: "p1",
          userId: "u1",
          username: null,
          avatarUrl: null,
          displayName: "Leader",
          totalScore: 20,
          maxPossibleScore: 450,
          correctPicks: 1,
          incorrectPicks: 0,
          championPickName: "France",
          championTeamId: "france",
          championStillAlive: true,
          roundBreakdown: {},
          joinedAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          rank: 2,
          entryId: "e2",
          entryName: "Mine",
          participantId: "p2",
          userId: "u2",
          username: null,
          avatarUrl: null,
          displayName: "Me",
          totalScore: 10,
          maxPossibleScore: 500,
          correctPicks: 0,
          incorrectPicks: 0,
          championPickName: "Brazil",
          championTeamId: "brazil",
          championStillAlive: true,
          roundBreakdown: {},
          joinedAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      hasBracketBrainAi: true,
    })

    expect(insight.locked).toBe(false)
    expect(insight.lines.join(" ")).toContain("10-point gap")
    expect(insight.lines.join(" ")).toContain("Some unfinalized entries are hidden until submitted.")
  })
})

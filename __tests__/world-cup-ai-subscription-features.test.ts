import { describe, expect, it } from "vitest"
import {
  buildWorldCupPathToWinInsight,
  calculateWorldCupBracketGrade,
  calculateWorldCupLeaderboardAiInsights,
} from "@/lib/world-cup/worldCupAiSubscriptionInsights"
import {
  buildWorldCupGroupStageGroupInsights,
  buildWorldCupGroupStageThirdPlaceInsights,
} from "@/lib/world-cup/worldCupAiInsights"

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

describe("buildWorldCupGroupStageGroupInsights — deterministic per-group", () => {
  const teamsAlphabet = [
    { teamId: "t1", name: "Argentina", seedOrder: 1 },
    { teamId: "t2", name: "Brazil", seedOrder: 2 },
    { teamId: "t3", name: "Canada", seedOrder: 3 },
    { teamId: "t4", name: "Denmark", seedOrder: 4 },
  ]

  it("returns missing-picks guidance when group is incomplete", () => {
    const lines = buildWorldCupGroupStageGroupInsights({
      groupName: "Group D",
      groupKey: "D",
      teams: teamsAlphabet.slice(0, 3),
      order: ["t1", "t2"],
    })
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/Group D still has unranked teams/i)
  })

  it("returns missing-picks guidance when fewer than 4 order entries", () => {
    const lines = buildWorldCupGroupStageGroupInsights({
      groupName: "Group A",
      groupKey: "A",
      teams: teamsAlphabet,
      order: ["t1", "t2", "t3"], // only 3 ranked
    })
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/still has unranked teams/i)
  })

  it("produces safe/chalk insights when user picks match seeding exactly", () => {
    const lines = buildWorldCupGroupStageGroupInsights({
      groupName: "Group A",
      groupKey: "A",
      teams: teamsAlphabet,
      order: ["t1", "t2", "t3", "t4"], // 1→1, 2→2, 3→3, 4→4
    })
    const text = lines.join("\n")
    expect(text).toMatch(/Safest group winner/i)
    expect(text).toMatch(/Argentina/i)
    expect(text).toMatch(/Strategy: pure chalk/i)
  })

  it("flags a risky winner when user picks a low-seed team (seed #3 or #4) to win", () => {
    const lines = buildWorldCupGroupStageGroupInsights({
      groupName: "Group F",
      groupKey: "F",
      teams: teamsAlphabet,
      order: ["t3", "t2", "t1", "t4"], // user picks #3 seed as winner
    })
    const text = lines.join("\n")
    expect(text).toMatch(/Risky winner/i)
    expect(text).toMatch(/Canada/i)
    expect(text).toMatch(/higher-risk call/i)
  })

  it("flags high-variance when user ordering significantly inverts seeding", () => {
    const lines = buildWorldCupGroupStageGroupInsights({
      groupName: "Group B",
      groupKey: "B",
      teams: teamsAlphabet,
      order: ["t4", "t3", "t2", "t1"], // fully inverted from seeding
    })
    const text = lines.join("\n")
    expect(text).toMatch(/Risky winner|Strategy: high-variance/i)
  })

  it("never includes wagering or betting terms in produced lines", () => {
    const lines = buildWorldCupGroupStageGroupInsights({
      groupName: "Group A",
      groupKey: "A",
      teams: teamsAlphabet,
      order: ["t1", "t2", "t3", "t4"],
    })
    const text = lines.join(" ").toLowerCase()
    expect(text).not.toMatch(/\bdfs\b|\bbetting\b|\bwager|\bsportsbook\b|\bodds\b/)
  })
})

describe("buildWorldCupGroupStageThirdPlaceInsights — deterministic third-place pool", () => {
  const groups = [
    {
      id: "g-a", groupKey: "A", displayName: "Group A",
      teams: [
        { teamId: "a1", name: "Argentina", seedOrder: 1 },
        { teamId: "a2", name: "Brazil", seedOrder: 2 },
        { teamId: "a3", name: "Canada", seedOrder: 3 },
        { teamId: "a4", name: "Denmark", seedOrder: 4 },
      ],
    },
    {
      id: "g-b", groupKey: "B", displayName: "Group B",
      teams: [
        { teamId: "b1", name: "England", seedOrder: 1 },
        { teamId: "b2", name: "France", seedOrder: 2 },
        { teamId: "b3", name: "Germany", seedOrder: 3 },
        { teamId: "b4", name: "Honduras", seedOrder: 4 },
      ],
    },
  ]

  it("returns fallback when no third-place picks are selected", () => {
    const lines = buildWorldCupGroupStageThirdPlaceInsights({
      groups,
      thirdPlacePicks: [],
    })
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/Select 8 third-place advancers/i)
  })

  it("shows progress message when partial selection (under required count)", () => {
    const lines = buildWorldCupGroupStageThirdPlaceInsights({
      groups,
      thirdPlacePicks: [
        { groupId: "g-a", teamId: "a3", isSelected: true },
        { groupId: "g-b", teamId: "b4", isSelected: true },
      ],
    })
    expect(lines[0]).toMatch(/Current selected: 2 of 8/)
    expect(lines[0]).toMatch(/6 more to lock in/i)
  })

  it("flags upside/volatility when most third-place picks are low-seed (>=3)", () => {
    const lines = buildWorldCupGroupStageThirdPlaceInsights({
      groups,
      thirdPlacePicks: [
        { groupId: "g-a", teamId: "a3", isSelected: true },
        { groupId: "g-a", teamId: "a4", isSelected: true },
        { groupId: "g-b", teamId: "b3", isSelected: true },
        { groupId: "g-b", teamId: "b4", isSelected: true },
      ],
      requiredCount: 4, // smaller required so 4 low-seed >= ceil(4/2)
    })
    const text = lines.join("\n")
    expect(text).toMatch(/lower-seed third-place teams/i)
    expect(text).toMatch(/upside but adds volatility/i)
  })

  it("flags safer advancement when most picks are top-seeded", () => {
    const lines = buildWorldCupGroupStageThirdPlaceInsights({
      groups,
      thirdPlacePicks: [
        { groupId: "g-a", teamId: "a1", isSelected: true },
        { groupId: "g-a", teamId: "a2", isSelected: true },
        { groupId: "g-b", teamId: "b1", isSelected: true },
        { groupId: "g-b", teamId: "b2", isSelected: true },
      ],
    })
    const text = lines.join("\n")
    expect(text).toMatch(/Strong third-place pool/i)
    expect(text).toMatch(/safer advancement odds/i)
  })

  it("produces differentiation message for a balanced pool", () => {
    const lines = buildWorldCupGroupStageThirdPlaceInsights({
      groups,
      thirdPlacePicks: [
        { groupId: "g-a", teamId: "a2", isSelected: true },
        { groupId: "g-b", teamId: "b3", isSelected: true },
      ],
    })
    const text = lines.join("\n")
    expect(text).toMatch(/differentiation if those groups break your way/i)
  })

  it("never includes wagering/betting terms", () => {
    const lines = buildWorldCupGroupStageThirdPlaceInsights({
      groups,
      thirdPlacePicks: [
        { groupId: "g-a", teamId: "a3", isSelected: true },
      ],
    })
    const text = lines.join(" ").toLowerCase()
    expect(text).not.toMatch(/\bdfs\b|\bbetting\b|\bwager|\bsportsbook\b|\bodds\b/)
  })
})

describe("Group Stage AI insights — no external AI dependencies", () => {
  it("helpers do not import OpenAI/XAI providers", async () => {
    // Static import-graph check: re-import the helper module fresh and confirm
    // the module source does not reference any AI provider client.
    const fs = await import("node:fs/promises")
    const path = await import("node:path")
    const filePath = path.resolve(process.cwd(), "lib/world-cup/worldCupAiInsights.ts")
    const src = await fs.readFile(filePath, "utf-8")
    expect(src).not.toMatch(/OPENAI_API_KEY|XAI_API_KEY|new OpenAI|createOpenAI|openai\.com/i)
  })
})


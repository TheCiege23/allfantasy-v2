import { describe, expect, it } from "vitest"
import {
  computeWorldCupPersonalImpact,
  type ComputeWorldCupPersonalImpactParams,
} from "@/lib/world-cup/worldCupPersonalImpactService"
import type { DbEntryForLb, DbMatch } from "@/lib/world-cup/worldCupScoringService"
import type { WorldCupLeaderboardRow } from "@/lib/world-cup/types"

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeMatch(overrides: Partial<DbMatch> = {}): DbMatch {
  return {
    id: "match-1",
    round: "semifinal",
    homeSlotKey: "SF1_HOME",
    awaySlotKey: "SF1_AWAY",
    homeTeamId: "team-brazil",
    awayTeamId: "team-france",
    homeTeamName: "Brazil",
    awayTeamName: "France",
    status: "scheduled",
    winnerTeamId: null,
    winnerTeamName: null,
    apiStatusShort: null,
    startsAt: new Date(Date.now() + 3_600_000).toISOString(),
    ...overrides,
  }
}

function makeEntry(
  userId: string,
  picks: DbEntryForLb["picks"] = [],
  overrides: Partial<DbEntryForLb> = {}
): DbEntryForLb {
  return {
    id: `entry-${userId}`,
    participantId: `participant-${userId}`,
    userId,
    name: `Entry ${userId}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    championTeamId: null,
    championTeamName: null,
    picks,
    ...overrides,
  }
}

function makePick(
  matchId: string,
  selectedTeamId: string,
  selectedTeamName: string,
  round = "semifinal"
): DbEntryForLb["picks"][0] {
  return {
    id: `pick-${matchId}-${selectedTeamId}`,
    matchId,
    round,
    selectedTeamId,
    selectedTeamName,
    selectedSlotKey: null,
  }
}

function makeLbRow(userId: string, rank: number, totalScore: number): WorldCupLeaderboardRow {
  return {
    rank,
    entryId: `entry-${userId}`,
    entryName: `Entry ${userId}`,
    participantId: `participant-${userId}`,
    userId,
    username: userId,
    avatarUrl: null,
    displayName: userId,
    totalScore,
    maxPossibleScore: totalScore + 40,
    correctPicks: 4,
    incorrectPicks: 1,
    championPickName: null,
    championTeamId: null,
    championStillAlive: false,
    championCorrect: false,
    finalistsCorrect: 0,
    knockoutPicksCorrect: 3,
    groupWinnersCorrect: 1,
    roundBreakdown: {},
    joinedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    submittedAt: null,
  }
}

const DEFAULT_SCORING = {
  roundOf32Points: 1,
  roundOf16Points: 2,
  quarterFinalPoints: 4,
  semiFinalPoints: 8,
  finalPoints: 16,
  championBonusPoints: 20,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("WorldCupPersonalImpactService", () => {
  it("P1: user has direct pick for home team — roots home with correct points at stake", () => {
    const match = makeMatch()
    const userEntry = makeEntry("user-1", [
      makePick("match-1", "team-brazil", "Brazil", "semifinal"),
    ])
    const rivalEntry = makeEntry("user-2", [
      makePick("match-1", "team-france", "France", "semifinal"),
    ])

    const params: ComputeWorldCupPersonalImpactParams = {
      matchId: "match-1",
      userId: "user-1",
      userEntry,
      allEntries: [userEntry, rivalEntry],
      allMatches: [match],
      leaderboard: [makeLbRow("user-1", 1, 20), makeLbRow("user-2", 2, 18)],
      scoring: DEFAULT_SCORING,
    }

    const result = computeWorldCupPersonalImpact(params)

    expect(result.userRootingSide).toBe("home")
    expect(result.possiblePointsAtStake).toBe(8)
    expect(result.confidence).toBe("high")
    expect(result.noEntry).toBe(false)
    expect(result.affectedUserPickIds).toContain("pick-match-1-team-brazil")
    expect(result.rivalsHelped).toBe(1)
    expect(result.bestResultForUser?.teamName).toBe("Brazil")
    expect(result.explanation).toContain("Brazil")
  })

  it("P2: no user entry → noEntry result", () => {
    const match = makeMatch()
    const params: ComputeWorldCupPersonalImpactParams = {
      matchId: "match-1",
      userId: "user-nobody",
      userEntry: null,
      allEntries: [],
      allMatches: [match],
      leaderboard: [],
      scoring: DEFAULT_SCORING,
    }

    const result = computeWorldCupPersonalImpact(params)

    expect(result.noEntry).toBe(true)
    expect(result.impactScore).toBe(0)
    expect(result.explanation).toContain("no bracket entry")
  })

  it("P3: match already finished → impactScore = 0", () => {
    const match = makeMatch({
      status: "final",
      winnerTeamId: "team-brazil",
      winnerTeamName: "Brazil",
      apiStatusShort: "FT",
    })
    const userEntry = makeEntry("user-1", [
      makePick("match-1", "team-brazil", "Brazil", "semifinal"),
    ])

    const params: ComputeWorldCupPersonalImpactParams = {
      matchId: "match-1",
      userId: "user-1",
      userEntry,
      allEntries: [userEntry],
      allMatches: [match],
      leaderboard: [makeLbRow("user-1", 1, 20)],
      scoring: DEFAULT_SCORING,
    }

    const result = computeWorldCupPersonalImpact(params)

    expect(result.impactScore).toBe(0)
    expect(result.userRootingSide).toBe("neither")
    expect(result.explanation).toContain("already finished")
  })

  it("P4: cascade picks only (no direct pick) → medium confidence, away side", () => {
    const qfMatch = makeMatch({ id: "match-qf", round: "quarterfinal" })
    // User has no direct pick for qfMatch but picked France (awayTeam) in semifinal
    const sfPick = makePick("match-sf", "team-france", "France", "semifinal")
    const userEntry = makeEntry("user-1", [sfPick])

    const params: ComputeWorldCupPersonalImpactParams = {
      matchId: "match-qf",
      userId: "user-1",
      userEntry,
      allEntries: [userEntry],
      allMatches: [qfMatch],
      leaderboard: [makeLbRow("user-1", 2, 12)],
      scoring: DEFAULT_SCORING,
    }

    const result = computeWorldCupPersonalImpact(params)

    expect(result.confidence).toBe("medium")
    expect(result.userRootingSide).toBe("away")
    expect(result.affectedUserPickIds).toContain(sfPick.id)
    expect(result.noEntry).toBe(false)
  })

  it("P5: champion is playing → championRiskNote populated, impact boosted", () => {
    const match = makeMatch()
    const userEntry = makeEntry(
      "user-1",
      [makePick("match-1", "team-brazil", "Brazil", "semifinal")],
      { championTeamId: "team-brazil", championTeamName: "Brazil" }
    )

    const params: ComputeWorldCupPersonalImpactParams = {
      matchId: "match-1",
      userId: "user-1",
      userEntry,
      allEntries: [userEntry],
      allMatches: [match],
      leaderboard: [makeLbRow("user-1", 1, 30)],
      scoring: DEFAULT_SCORING,
    }

    const result = computeWorldCupPersonalImpact(params)

    expect(result.championRiskNote).not.toBeNull()
    expect(result.championRiskNote).toContain("Brazil")
    expect(result.impactScore).toBeGreaterThan(40)
  })

  it("P6: all rivals on same side as user → rivalsHelped = 0", () => {
    const match = makeMatch()
    const userEntry = makeEntry("user-1", [
      makePick("match-1", "team-brazil", "Brazil", "semifinal"),
    ])
    const rivals = ["user-2", "user-3", "user-4"].map((uid) =>
      makeEntry(uid, [makePick("match-1", "team-brazil", "Brazil", "semifinal")])
    )
    const allEntries = [userEntry, ...rivals]

    const params: ComputeWorldCupPersonalImpactParams = {
      matchId: "match-1",
      userId: "user-1",
      userEntry,
      allEntries,
      allMatches: [match],
      leaderboard: allEntries.map((e, i) => makeLbRow(e.userId, i + 1, 20 - i * 2)),
      scoring: DEFAULT_SCORING,
    }

    const result = computeWorldCupPersonalImpact(params)

    expect(result.rivalsHelped).toBe(0)
    expect(result.rankSwingEstimate).toBe(0)
  })

  it("P7: match not found → noData result", () => {
    const userEntry = makeEntry("user-1", [])
    const params: ComputeWorldCupPersonalImpactParams = {
      matchId: "nonexistent-match",
      userId: "user-1",
      userEntry,
      allEntries: [userEntry],
      allMatches: [],
      leaderboard: [],
      scoring: DEFAULT_SCORING,
    }

    const result = computeWorldCupPersonalImpact(params)

    expect(result.impactScore).toBe(0)
    expect(result.noEntry).toBe(false)
    expect(result.explanation).toContain("not available")
    expect(result.dataSourceLabel).toBe("none")
  })
})

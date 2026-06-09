/**
 * World Cup Daily Edge Report — deterministic section tests
 *
 * Tests the pure computation engine (computeWorldCupEdgeReport) against a
 * variety of pool states. No DB, no LLM, no mocks needed — pure function.
 *
 * Coverage:
 *  A. Section content: each section returns the right headline/subtext/bullets
 *  B. Edge cases: no entry, no upcoming matches, no pending picks
 *  C. Threats: correct identification of rivals who can pass
 *  D. Best path: accurate climb calculation
 *  E. Mistake to avoid: champion risk + accuracy risk detection
 *  F. Grounding: key fields correctly populated for LLM consumption
 */

import { describe, it, expect } from "vitest"
import { computeWorldCupEdgeReport } from "@/lib/world-cup/worldCupEdgeReport"
import type { WorldCupChimmyContext } from "@/lib/world-cup/worldCupChimmyContext"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SCORING = {
  roundOf32Points: 1,
  roundOf16Points: 2,
  quarterFinalPoints: 4,
  semiFinalPoints: 8,
  finalPoints: 12,
  championBonusPoints: 16,
  thirdPlacePoints: 3,
}

function makeContext(overrides: Partial<WorldCupChimmyContext> = {}): WorldCupChimmyContext {
  return {
    challengeId: "chal-1",
    poolName: "Test World Cup Pool",
    isLocked: true,
    lockReason: null,
    participantCount: 5,
    entryCount: 5,
    finalizedEntryCount: 5,
    inviteCount: 0,
    scoring: SCORING,
    userRole: "participant",
    commissionerSettings: null,
    liveDataStatus: "pool_only" as any,
    lastSyncedAt: null,
    locale: "en",
    fetchedAt: "2026-06-09T10:00:00Z",
    liveMatches: [],
    upcomingMatches: [],
    recentMatches: [],
    groupStandings: [],
    entry: {
      entryId: "entry-user",
      entryName: "My Entry",
      championPick: "Brazil",
      totalScore: 120,
      maxPossibleScore: 160,
      rank: 2,
      correctPicks: 8,
      incorrectPicks: 2,
      isComplete: true,
      isLocked: true,
      groupPicks: [],
      knockoutPicks: [
        // Decided correct pick
        { round: "roundOf16", homeTeamName: "Brazil", awayTeamName: "Poland", pickedTeam: "Brazil", isCorrect: true, pointsAwarded: 2 },
        // Decided incorrect pick
        { round: "roundOf16", homeTeamName: "France", awayTeamName: "Spain", pickedTeam: "France", isCorrect: false, pointsAwarded: 0 },
        // Pending semifinal pick
        { round: "semifinal", homeTeamName: "Brazil", awayTeamName: "Germany", pickedTeam: "Brazil", isCorrect: null, pointsAwarded: 0 },
        // Pending final pick
        { round: "final", homeTeamName: "Brazil", awayTeamName: "Argentina", pickedTeam: "Brazil", isCorrect: null, pointsAwarded: 0 },
      ],
      thirdPlacePicks: [],
    },
    leaderboard: [
      { rank: 1, entryId: "e-leader", entryName: "Top Dog", userId: "u-leader", totalScore: 140, maxPossibleScore: 168, championPickName: "Argentina" },
      { rank: 2, entryId: "entry-user", entryName: "My Entry", userId: "user-1", totalScore: 120, maxPossibleScore: 160, championPickName: "Brazil" },
      { rank: 3, entryId: "e-threat", entryName: "Close Behind", userId: "u-threat", totalScore: 100, maxPossibleScore: 148, championPickName: "France" },
      { rank: 4, entryId: "e-safe", entryName: "Too Far Back", userId: "u-safe", totalScore: 80, maxPossibleScore: 115, championPickName: "Germany" },
    ],
    upcomingMatches: [
      {
        matchId: "m-sf1",
        round: "semifinal",
        homeTeamName: "Brazil",
        awayTeamName: "Germany",
        homeScore: null,
        awayScore: null,
        homePenaltyScore: null,
        awayPenaltyScore: null,
        winnerTeamName: null,
        status: "scheduled",
        minute: null,
        injuryTime: null,
        startsAt: "2026-06-10T15:00:00Z",
        venueName: "MetLife Stadium",
        venueCity: "East Rutherford",
        apiStatusShort: null,
        lastSyncedAt: null,
      },
    ],
    ...overrides,
  }
}

const USER_ID = "user-1"

// ── Suite A: Section content ──────────────────────────────────────────────────

describe("A. Section content — correct headlines and bullets", () => {
  it("A1. matchThatMatters: finds the highest-value upcoming pick", () => {
    const report = computeWorldCupEdgeReport(makeContext(), USER_ID)
    const s = report.sections.matchThatMatters

    // The semifinal (8pts) is the highest-value pending pick with an upcoming match
    expect(s.headline).toContain("Brazil")
    expect(s.headline).toContain("Germany")
    expect(s.subtext).toContain("Brazil")
    expect(s.confidence).toBe("high")  // match was found
  })

  it("A2. rootFor: prioritises highest-value pending pick", () => {
    const report = computeWorldCupEdgeReport(makeContext(), USER_ID)
    const s = report.sections.rootFor

    // Final (12pts) is higher value than semifinal (8pts) — root for the final pick
    expect(s.headline).toMatch(/Brazil/i)
    expect(s.bullets.length).toBeGreaterThan(0)
    expect(s.confidence).toBe("high")
  })

  it("A3. rootFor includes rival champion threat in bullets when different pick", () => {
    const report = computeWorldCupEdgeReport(makeContext(), USER_ID)
    const bullets = report.sections.rootFor.bullets

    // Leader has Argentina as champion pick; user has Brazil — should mention it
    const hasChampionBullet = bullets.some(
      (b) => b.toLowerCase().includes("argentina") || b.toLowerCase().includes("top dog")
    )
    expect(hasChampionBullet).toBe(true)
  })

  it("A4. threats: identifies rivals below who can still pass", () => {
    const report = computeWorldCupEdgeReport(makeContext(), USER_ID)
    const s = report.sections.threats

    // "Close Behind" has maxPossible 148 > user score 120 → threat
    // "Too Far Back" has maxPossible 115 < user score 120 → NOT a threat
    expect(s.headline).toMatch(/1 rival/)
    expect(s.bullets[0]).toContain("Close Behind")
    expect(s.confidence).toBe("high")
  })

  it("A5. bestPath: correct climb calculation", () => {
    const report = computeWorldCupEdgeReport(makeContext(), USER_ID)
    const s = report.sections.bestPath

    // User has: semifinal (8pts) + final (12pts) = 20 pending pts
    // optimistic score = 120 + 20 = 140
    // Leader has 140 — user can tie but not overtake (so climb = 0)
    expect(s.bullets.some((b) => b.includes("20 pts"))).toBe(true)
    expect(report.grounding.pendingPickPoints).toBe(20)
  })

  it("A6. mistakeToAvoid: high champion dependency detected", () => {
    // Champion bonus = 16pts, max possible = 160 → 10% — not flagged
    // But let's test with a scenario where it IS flagged
    const context = makeContext({
      entry: {
        ...makeContext().entry!,
        championPick: "Brazil",
        maxPossibleScore: 40,  // champion bonus = 16/40 = 40% → flagged
      },
    })
    const report = computeWorldCupEdgeReport(context, USER_ID)
    const s = report.sections.mistakeToAvoid

    expect(s.headline).toMatch(/champion/i)
    expect(s.confidence).toBe("high")
  })
})

// ── Suite B: Edge cases ───────────────────────────────────────────────────────

describe("B. Edge cases — graceful degradation", () => {
  it("B1. no entry → all sections degrade gracefully, noEntry=true", () => {
    const context = makeContext({ entry: null })
    const report = computeWorldCupEdgeReport(context, USER_ID)

    expect(report.noEntry).toBe(true)
    expect(report.hasPendingPicks).toBe(false)
    expect(report.grounding.pendingPickCount).toBe(0)

    // Sections return placeholder content, not errors
    expect(report.sections.matchThatMatters.headline).toBeTruthy()
    expect(report.sections.rootFor.headline).toBeTruthy()
    expect(report.sections.threats.headline).toBeTruthy()
    expect(report.sections.bestPath.headline).toBeTruthy()
    expect(report.sections.mistakeToAvoid.headline).toBeTruthy()
  })

  it("B2. no upcoming matches → matchThatMatters has low confidence", () => {
    const context = makeContext({ upcomingMatches: [] })
    const report = computeWorldCupEdgeReport(context, USER_ID)

    // User has a semifinal pick but no upcoming match to match it to
    const s = report.sections.matchThatMatters
    // The section still shows the pick's teams even without a matched upcoming match
    expect(s.confidence).toBe("medium")  // pick found but match not confirmed
  })

  it("B3. all picks decided → hasPendingPicks=false, bestPath shows final rank", () => {
    const context = makeContext({
      entry: {
        ...makeContext().entry!,
        knockoutPicks: [
          { round: "semifinal", homeTeamName: "Brazil", awayTeamName: "Germany", pickedTeam: "Brazil", isCorrect: true, pointsAwarded: 8 },
          { round: "final", homeTeamName: "Brazil", awayTeamName: "Argentina", pickedTeam: "Brazil", isCorrect: false, pointsAwarded: 0 },
        ],
      },
    })
    const report = computeWorldCupEdgeReport(context, USER_ID)

    expect(report.hasPendingPicks).toBe(false)
    expect(report.grounding.pendingPickPoints).toBe(0)
    expect(report.sections.bestPath.headline).toMatch(/2nd|rank|complete/i)
  })

  it("B4. user in first place → no upward threats", () => {
    const context = makeContext({
      entry: { ...makeContext().entry!, rank: 1, totalScore: 180 },
    })
    const report = computeWorldCupEdgeReport(context, USER_ID)

    // No one ahead of rank 1
    expect(report.grounding.threatCount).toBe(0)
  })

  it("B5. empty leaderboard → sections return low-confidence placeholders", () => {
    const context = makeContext({ leaderboard: [] })
    const report = computeWorldCupEdgeReport(context, USER_ID)

    expect(report.totalEntries).toBe(0)
    expect(report.grounding.threatCount).toBe(0)
    // Shouldn't crash
    expect(report.sections.threats.headline).toBeTruthy()
  })
})

// ── Suite C: Threat detection ─────────────────────────────────────────────────

describe("C. Threat detection accuracy", () => {
  it("C1. only counts rivals with maxPossible > userScore as threats", () => {
    // user score = 120
    // Close Behind: maxPossible 148 > 120 → threat
    // Too Far Back: maxPossible 115 < 120 → not a threat
    const report = computeWorldCupEdgeReport(makeContext(), USER_ID)
    expect(report.grounding.threatCount).toBe(1)
    expect(report.grounding.topThreatName).toBe("Close Behind")
  })

  it("C2. threat count excludes the user themselves", () => {
    const context = makeContext({
      leaderboard: [
        { rank: 1, entryId: "entry-user", entryName: "My Entry", userId: "user-1", totalScore: 120, maxPossibleScore: 160, championPickName: "Brazil" },
        { rank: 2, entryId: "e-other", entryName: "Other", userId: "u-other", totalScore: 100, maxPossibleScore: 150, championPickName: "France" },
      ],
      entry: { ...makeContext().entry!, rank: 1, totalScore: 120 },
    })
    const report = computeWorldCupEdgeReport(context, USER_ID)
    // "Other" is rank 2, maxPossible 150 > 120, rank > userRank(1) → threat
    expect(report.grounding.threatCount).toBe(1)
  })

  it("C3. no threats when everyone below can no longer catch up", () => {
    const context = makeContext({
      leaderboard: [
        { rank: 1, entryId: "e1", entryName: "Leader", userId: "u-1", totalScore: 200, maxPossibleScore: 200, championPickName: "Brazil" },
        { rank: 2, entryId: "entry-user", entryName: "My Entry", userId: "user-1", totalScore: 160, maxPossibleScore: 180, championPickName: "Brazil" },
        { rank: 3, entryId: "e3", entryName: "Behind", userId: "u-3", totalScore: 50, maxPossibleScore: 80, championPickName: "France" },
      ],
      entry: { ...makeContext().entry!, rank: 2, totalScore: 160 },
    })
    const report = computeWorldCupEdgeReport(context, USER_ID)
    // "Behind" maxPossible 80 < user score 160 → NOT a threat
    expect(report.grounding.threatCount).toBe(0)
    expect(report.sections.threats.headline).toMatch(/safe/i)
  })
})

// ── Suite D: Best path math ───────────────────────────────────────────────────

describe("D. Best path climb calculation", () => {
  it("D1. correctly sums pending pick points by round", () => {
    // User has: semifinal (8pts) + final (12pts) = 20pts
    const report = computeWorldCupEdgeReport(makeContext(), USER_ID)
    expect(report.grounding.pendingPickPoints).toBe(20)
  })

  it("D2. correctly counts reachable rivals above", () => {
    // User score 120, pending 20pts → optimistic 140
    // Leader has score 140 → not overtakeable (140 is not < 140)
    // So bestClimbSpots = 0
    const report = computeWorldCupEdgeReport(makeContext(), USER_ID)
    expect(report.grounding.bestClimbSpots).toBe(0)
  })

  it("D3. bestClimbSpots > 0 when optimistic score overtakes rivals", () => {
    const context = makeContext({
      leaderboard: [
        { rank: 1, entryId: "e1", entryName: "Beatable Leader", userId: "u-1", totalScore: 130, maxPossibleScore: 140, championPickName: "Germany" },
        { rank: 2, entryId: "entry-user", entryName: "My Entry", userId: "user-1", totalScore: 120, maxPossibleScore: 160, championPickName: "Brazil" },
        { rank: 3, entryId: "e3", entryName: "Behind", userId: "u-3", totalScore: 100, maxPossibleScore: 130, championPickName: "France" },
      ],
      entry: { ...makeContext().entry!, rank: 2, totalScore: 120 },
    })
    // User optimistic = 120 + 20 = 140 > leader's 130 → can climb 1 spot
    const report = computeWorldCupEdgeReport(context, USER_ID)
    expect(report.grounding.bestClimbSpots).toBe(1)
    expect(report.sections.bestPath.headline).toMatch(/\+1 spot/)
  })
})

// ── Suite E: Mistake to avoid ─────────────────────────────────────────────────

describe("E. Mistake to avoid — risk detection", () => {
  it("E1. champion dependency flagged when >35% of max score", () => {
    const context = makeContext({
      entry: {
        ...makeContext().entry!,
        maxPossibleScore: 40,   // 16/40 = 40% → flagged
        championPick: "Brazil",
      },
    })
    const report = computeWorldCupEdgeReport(context, USER_ID)
    expect(report.sections.mistakeToAvoid.headline).toMatch(/champion/i)
  })

  it("E2. crowd pick flagged when ≥50% of pool shares champion", () => {
    const context = makeContext({
      entry: { ...makeContext().entry!, championPick: "Brazil" },
      leaderboard: [
        { rank: 1, entryId: "entry-user", entryName: "My Entry", userId: "user-1", totalScore: 120, maxPossibleScore: 160, championPickName: "Brazil" },
        { rank: 2, entryId: "e2", entryName: "Also Brazil", userId: "u-2", totalScore: 100, maxPossibleScore: 140, championPickName: "Brazil" },
        { rank: 3, entryId: "e3", entryName: "Different", userId: "u-3", totalScore: 80, maxPossibleScore: 120, championPickName: "France" },
      ],
    })
    // 2/3 = 67% have Brazil → crowd pick warning
    const report = computeWorldCupEdgeReport(context, USER_ID)
    expect(report.sections.mistakeToAvoid.headline).toMatch(/crowd|champion/i)
  })

  it("E3. no risk → returns safe fallback", () => {
    // Low champion dependency, unique pick, decent accuracy
    const context = makeContext({
      entry: {
        ...makeContext().entry!,
        championPick: "Brazil",
        maxPossibleScore: 200,  // 16/200 = 8% → not flagged
        correctPicks: 10,
        incorrectPicks: 2,
      },
      leaderboard: [
        { rank: 1, entryId: "e1", entryName: "Leader", userId: "u-1", totalScore: 140, maxPossibleScore: 168, championPickName: "Argentina" },
        { rank: 2, entryId: "entry-user", entryName: "My Entry", userId: "user-1", totalScore: 120, maxPossibleScore: 200, championPickName: "Brazil" },
      ],
    })
    const report = computeWorldCupEdgeReport(context, USER_ID)
    expect(report.sections.mistakeToAvoid.headline).toMatch(/no major|safe/i)
  })
})

// ── Suite F: Grounding fields ─────────────────────────────────────────────────

describe("F. Grounding — fields populated for LLM consumption", () => {
  it("F1. all grounding fields are populated (not undefined)", () => {
    const report = computeWorldCupEdgeReport(makeContext(), USER_ID)
    const g = report.grounding

    expect(g.poolName).toBe("Test World Cup Pool")
    expect(g.userRank).toBe(2)
    expect(g.totalEntries).toBe(4)
    expect(g.userScore).toBe(120)
    expect(g.userMaxPossible).toBe(160)
    expect(g.userChampion).toBe("Brazil")
    expect(typeof g.championStillAlive).toBe("boolean")
    expect(typeof g.threatCount).toBe("number")
    expect(typeof g.pendingPickCount).toBe("number")
    expect(typeof g.pendingPickPoints).toBe("number")
    expect(typeof g.bestClimbSpots).toBe("number")
    expect(typeof g.hasLiveMatches).toBe("boolean")
  })

  it("F2. championStillAlive=false when champion pick is marked incorrect", () => {
    const context = makeContext({
      entry: {
        ...makeContext().entry!,
        championPick: "Brazil",
        knockoutPicks: [
          // Brazil was eliminated
          { round: "semifinal", homeTeamName: "Brazil", awayTeamName: "Germany", pickedTeam: "Brazil", isCorrect: false, pointsAwarded: 0 },
        ],
      },
    })
    const report = computeWorldCupEdgeReport(context, USER_ID)
    expect(report.grounding.championStillAlive).toBe(false)
  })

  it("F3. championStillAlive=true when no incorrect pick for champion team", () => {
    const report = computeWorldCupEdgeReport(makeContext(), USER_ID)
    // Brazil picked in semifinal but isCorrect=null (pending) → still alive
    expect(report.grounding.championStillAlive).toBe(true)
  })

  it("F4. report metadata fields are populated", () => {
    const report = computeWorldCupEdgeReport(makeContext(), USER_ID)
    expect(report.challengeId).toBe("chal-1")
    expect(report.poolName).toBe("Test World Cup Pool")
    expect(report.userRank).toBe(2)
    expect(report.totalEntries).toBe(4)
    expect(report.generatedAt).toBeTruthy()
    expect(report.hasPendingPicks).toBe(true)
    expect(report.hasLiveData).toBe(false)
    expect(report.noEntry).toBe(false)
  })
})

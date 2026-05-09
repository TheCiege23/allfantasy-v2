import { describe, expect, it } from "vitest"
import { normalizeWorldCupFixture } from "@/lib/world-cup/apiSportsWorldCup"
import { DEFAULT_WORLD_CUP_SCORING } from "@/lib/world-cup/worldCupBracketBuilder"
import {
  buildWorldCupRoundBreakdownRows,
  getWorldCupPossiblePointsRemaining,
  getWorldCupRankMovement,
} from "@/lib/world-cup/worldCupLeaderboardService"
import { buildWorldCupLeaderboardRows, evaluateWorldCupPick, isChampionStillAlive } from "@/lib/world-cup/worldCupScoringService"

describe("World Cup scoring", () => {
  it("keeps pending matches at 0 points with a pending result", () => {
    const result = evaluateWorldCupPick(
      {
        id: "m1",
        round: "round_of_32",
        status: "live",
        homeTeamId: "arg",
        awayTeamId: "bra",
        homeTeamName: "Argentina",
        awayTeamName: "Brazil",
        winnerTeamId: null,
        winnerTeamName: null,
        homeSlotKey: "A1",
        awaySlotKey: "B2",
      },
      { selectedTeamId: "arg", selectedTeamName: "Argentina", selectedSlotKey: "A1", round: "round_of_32" },
      DEFAULT_WORLD_CUP_SCORING
    )

    expect(result).toEqual({ pointsAwarded: 0, isCorrect: null })
  })

  it("awards round points for correct final results", () => {
    const result = evaluateWorldCupPick(
      {
        id: "m1",
        round: "quarterfinal",
        status: "final",
        homeTeamId: "arg",
        awayTeamId: "bra",
        homeTeamName: "Argentina",
        awayTeamName: "Brazil",
        winnerTeamId: "arg",
        homeSlotKey: "h",
        awaySlotKey: "a",
      },
      { selectedTeamId: "arg", selectedTeamName: "Argentina", round: "quarterfinal" },
      DEFAULT_WORLD_CUP_SCORING
    )
    expect(result).toEqual({ pointsAwarded: DEFAULT_WORLD_CUP_SCORING.quarterFinalPoints, isCorrect: true })
  })

  it("marks final wrong picks incorrect with 0 points", () => {
    const result = evaluateWorldCupPick(
      {
        id: "m1",
        round: "quarterfinal",
        status: "final",
        homeTeamId: "arg",
        awayTeamId: "bra",
        homeTeamName: "Argentina",
        awayTeamName: "Brazil",
        winnerTeamId: "arg",
        winnerTeamName: "Argentina",
        homeSlotKey: "h",
        awaySlotKey: "a",
      },
      { selectedTeamId: "bra", selectedTeamName: "Brazil", selectedSlotKey: "a", round: "quarterfinal" },
      DEFAULT_WORLD_CUP_SCORING
    )

    expect(result).toEqual({ pointsAwarded: 0, isCorrect: false })
  })

  it("uses penalty winner data from API-Football payloads", () => {
    const normalized = normalizeWorldCupFixture({
      fixture: { id: 10, date: "2026-07-19T20:00:00Z", status: { short: "PEN" } },
      league: { round: "Final" },
      teams: {
        home: { id: 1, name: "France", winner: false },
        away: { id: 2, name: "Spain", winner: false },
      },
      goals: { home: 1, away: 1 },
      score: { penalty: { home: 4, away: 5 } },
    })
    expect(normalized?.status).toBe("final")
    expect(normalized?.winnerApiTeamId).toBe(2)
  })

  it("preserves correct picks when a placeholder resolves via slot key", () => {
    const result = evaluateWorldCupPick(
      {
        round: "round_of_32",
        selectedTeamId: null,
        selectedTeamName: "Group A Winner",
        selectedSlotKey: "A1",
      },
      {
        id: "m1",
        round: "round_of_32",
        homeSlotKey: "A1",
        awaySlotKey: "B2",
        homeTeamId: "arg",
        awayTeamId: "ned",
        homeTeamName: "Argentina",
        awayTeamName: "Netherlands",
        status: "final",
        winnerTeamId: "arg",
        winnerTeamName: "Argentina",
      },
      DEFAULT_WORLD_CUP_SCORING
    )

    expect(result).toEqual({ isCorrect: true, pointsAwarded: DEFAULT_WORLD_CUP_SCORING.roundOf32Points })
  })

  it("adds scored points to the matching round breakdown", () => {
    const rows = buildWorldCupLeaderboardRows({
      entries: [
        {
          id: "e1",
          participantId: "p1",
          userId: "u1",
          name: "Bracket 1",
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-02"),
          picks: [
            {
              round: "round_of_32",
              selectedTeamId: "arg",
              selectedTeamName: "Argentina",
              selectedSlotKey: "A1",
              pointsAwarded: DEFAULT_WORLD_CUP_SCORING.roundOf32Points,
              isCorrect: true,
            },
            {
              round: "quarterfinal",
              selectedTeamId: "bra",
              selectedTeamName: "Brazil",
              selectedSlotKey: "B1",
              pointsAwarded: 0,
              isCorrect: false,
            },
          ],
          participant: { displayName: "A", user: { username: "ma", avatarUrl: null, displayName: null } },
        },
      ],
      matches: [],
      scoring: DEFAULT_WORLD_CUP_SCORING,
    })

    expect(rows[0].totalScore).toBe(DEFAULT_WORLD_CUP_SCORING.roundOf32Points)
    expect(rows[0].roundBreakdown).toMatchObject({
      round_of_32: DEFAULT_WORLD_CUP_SCORING.roundOf32Points,
      quarterfinal: 0,
    })
  })

  it("sorts leaderboard by score, possible points, champion alive, then earliest completed bracket", () => {
    const rows = buildWorldCupLeaderboardRows({
      entries: [
        {
          id: "e1",
          participantId: "p1",
          userId: "u1",
          name: "Bracket 1",
          createdAt: new Date("2026-01-02"),
          updatedAt: new Date("2026-01-02"),
          submittedAt: new Date("2026-01-03"),
          championTeamId: "arg",
          championTeamName: null,
          picks: [
            {
              matchId: "m1",
              round: "round_of_32",
              selectedTeamId: "arg",
              selectedTeamName: "Argentina",
              selectedSlotKey: "A1",
              pointsAwarded: DEFAULT_WORLD_CUP_SCORING.roundOf32Points,
              isCorrect: true,
              match: {
                id: "m1",
                round: "round_of_32",
                status: "final",
                homeTeamId: "arg",
                awayTeamId: "bra",
                homeTeamName: "Argentina",
                awayTeamName: "Brazil",
                winnerTeamId: "arg",
                winnerTeamName: "Argentina",
                homeSlotKey: "A1",
                awaySlotKey: "B2",
              },
            },
          ],
          participant: { displayName: "A", user: { username: "ma", avatarUrl: null, displayName: null } },
        },
        {
          id: "e2",
          participantId: "p2",
          userId: "u2",
          name: "Bracket 1",
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
          submittedAt: new Date("2026-01-02"),
          championTeamId: "arg",
          championTeamName: null,
          picks: [
            {
              matchId: "m1",
              round: "round_of_32",
              selectedTeamId: "arg",
              selectedTeamName: "Argentina",
              selectedSlotKey: "A1",
              pointsAwarded: DEFAULT_WORLD_CUP_SCORING.roundOf32Points,
              isCorrect: true,
              match: {
                id: "m1",
                round: "round_of_32",
                status: "final",
                homeTeamId: "arg",
                awayTeamId: "bra",
                homeTeamName: "Argentina",
                awayTeamName: "Brazil",
                winnerTeamId: "arg",
                winnerTeamName: "Argentina",
                homeSlotKey: "A1",
                awaySlotKey: "B2",
              },
            },
            {
              matchId: "mf",
              round: "final",
              selectedTeamId: "fra",
              selectedTeamName: "France",
              selectedSlotKey: "F1",
              pointsAwarded: 0,
              isCorrect: null,
              match: {
                id: "mf",
                round: "final",
                status: "scheduled",
                homeTeamId: "arg",
                awayTeamId: "fra",
                homeTeamName: "Argentina",
                awayTeamName: "France",
                winnerTeamId: null,
                winnerTeamName: null,
                homeSlotKey: "A1",
                awaySlotKey: "F1",
              },
            },
          ],
          participant: { displayName: "B", user: { username: "mb", avatarUrl: null, displayName: null } },
        },
      ],
      matches: [
        {
          id: "mf",
          status: "final",
          round: "final",
          homeTeamId: "arg",
          awayTeamId: "bra",
          winnerTeamId: "arg",
          homeTeamName: "Argentina",
          awayTeamName: "Brazil",
          winnerTeamName: "Argentina",
          homeSlotKey: "h",
          awaySlotKey: "a",
        },
        {
          id: "mf",
          status: "scheduled",
          round: "final",
          homeTeamId: "arg",
          awayTeamId: "fra",
          winnerTeamId: null,
          winnerTeamName: null,
          homeTeamName: "Argentina",
          awayTeamName: "France",
          homeSlotKey: "A1",
          awaySlotKey: "F1",
        },
      ],
      scoring: DEFAULT_WORLD_CUP_SCORING,
    })
    expect(rows[0].entryId).toBe("e2")
    expect(rows[0].rank).toBe(1)
    expect(rows[0].maxPossibleScore).toBe(
      DEFAULT_WORLD_CUP_SCORING.roundOf32Points + DEFAULT_WORLD_CUP_SCORING.finalPoints
    )
    expect(rows[1].entryId).toBe("e1")
  })

  it("detects when a champion pick has been eliminated before the final", () => {
    expect(
      isChampionStillAlive({
        championPickTeamId: "bra",
        matches: [
          {
            id: "x",
            status: "final",
            round: "semifinal",
            homeTeamId: "arg",
            awayTeamId: "bra",
            winnerTeamId: "arg",
            homeTeamName: "Argentina",
            awayTeamName: "Brazil",
            homeSlotKey: "h",
            awaySlotKey: "a",
          },
        ],
      })
    ).toBe(false)
  })

  it("drops possible points when a future champion pick is eliminated", () => {
    const rows = buildWorldCupLeaderboardRows({
      entries: [
        {
          id: "busted",
          participantId: "p1",
          userId: "u1",
          name: "Busted Champion",
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
          championTeamId: "bra",
          championTeamName: "Brazil",
          picks: [
            {
              matchId: "final",
              round: "final",
              selectedTeamId: "bra",
              selectedTeamName: "Brazil",
              selectedSlotKey: "B1",
              pointsAwarded: 0,
              isCorrect: null,
              match: {
                id: "final",
                round: "final",
                status: "scheduled",
                homeTeamId: "arg",
                awayTeamId: "bra",
                homeTeamName: "Argentina",
                awayTeamName: "Brazil",
                winnerTeamId: null,
                winnerTeamName: null,
                homeSlotKey: "A1",
                awaySlotKey: "B1",
              },
            },
          ],
          participant: { displayName: "A", user: { username: "ma", avatarUrl: null, displayName: null } },
        },
      ],
      matches: [
        {
          id: "semi",
          status: "final",
          round: "semifinal",
          homeTeamId: "arg",
          awayTeamId: "bra",
          winnerTeamId: "arg",
          winnerTeamName: "Argentina",
          homeTeamName: "Argentina",
          awayTeamName: "Brazil",
          homeSlotKey: "A1",
          awaySlotKey: "B1",
        },
      ],
      scoring: DEFAULT_WORLD_CUP_SCORING,
    })

    expect(rows[0].championStillAlive).toBe(false)
    expect(rows[0].maxPossibleScore).toBe(0)
  })

  it("still scores leaderboard rows from locked saved picks", () => {
    const rows = buildWorldCupLeaderboardRows({
      entries: [
        {
          id: "locked-entry",
          participantId: "p1",
          userId: "u1",
          name: "Locked Bracket",
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
          championTeamId: "arg",
          championTeamName: "Argentina",
          isLocked: true,
          picks: [
            {
              round: "round_of_32",
              selectedTeamId: "arg",
              selectedTeamName: "Argentina",
              pointsAwarded: DEFAULT_WORLD_CUP_SCORING.roundOf32Points,
              isCorrect: true,
            },
          ],
          participant: { displayName: "A", user: { username: "ma", avatarUrl: null, displayName: null } },
        },
      ],
      matches: [],
      scoring: DEFAULT_WORLD_CUP_SCORING,
    })

    expect(rows[0].entryId).toBe("locked-entry")
    expect(rows[0].totalScore).toBe(DEFAULT_WORLD_CUP_SCORING.roundOf32Points)
    expect(rows[0].correctPicks).toBe(1)
  })
})

describe("worldCupLeaderboardService display helpers", () => {
  it("computes possible points remaining from max ceiling minus current score", () => {
    expect(getWorldCupPossiblePointsRemaining(40, 100)).toBe(60)
    expect(getWorldCupPossiblePointsRemaining(100, 100)).toBe(0)
  })

  it("classifies rank movement between refreshes", () => {
    expect(getWorldCupRankMovement(5, 3)).toBe("up")
    expect(getWorldCupRankMovement(3, 5)).toBe("down")
    expect(getWorldCupRankMovement(2, 2)).toBe("same")
    expect(getWorldCupRankMovement(undefined, 1)).toBe("new")
  })

  it("builds round breakdown rows with earned vs per-correct weights", () => {
    const rows = buildWorldCupRoundBreakdownRows(
      { round_of_32: 10, final: 160 },
      DEFAULT_WORLD_CUP_SCORING,
      { includeThirdPlace: false }
    )
    expect(rows.find((r) => r.round === "round_of_32")?.pointsEarned).toBe(10)
    expect(rows.find((r) => r.round === "final")?.pointsEarned).toBe(160)
    expect(rows.find((r) => r.round === "final")?.pointsPerCorrect).toBe(
      DEFAULT_WORLD_CUP_SCORING.finalPoints
    )
  })
})

import { describe, expect, it } from "vitest"
import {
  getBracketBlockReason,
  mapJoinError,
  formatWorldCupPlaceholder,
} from "@/lib/world-cup/worldCupBracketUtils"
import {
  assertWorldCupPickPayloadReady,
  getWorldCupGuidedPicksState,
  getWorldCupUnpickableReason,
  isWorldCupMatchPickable,
} from "@/lib/world-cup/worldCupProjectedBracket"
import type { WorldCupMatchView } from "@/lib/world-cup/types"

function makeMatch(overrides: Partial<WorldCupMatchView> = {}): WorldCupMatchView {
  return {
    id: "m1",
    apiFixtureId: null,
    round: "round_of_32",
    roundIndex: 1,
    matchNumber: 1,
    homeSlotKey: "A1",
    awaySlotKey: "B2",
    homeTeamId: "team-a",
    awayTeamId: "team-b",
    homeTeamName: "Argentina",
    awayTeamName: "Brazil",
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
    ...overrides,
  }
}

describe("formatWorldCupPlaceholder", () => {
  it("formats group winner slots", () => {
    expect(formatWorldCupPlaceholder("A1", "TBD", null)).toBe("Group A Winner")
    expect(formatWorldCupPlaceholder("H1", "TBD", null)).toBe("Group H Winner")
  })

  it("formats group runner-up slots", () => {
    expect(formatWorldCupPlaceholder("B2", "TBD", null)).toBe("Group B Runner-up")
    expect(formatWorldCupPlaceholder("D2", "TBD", null)).toBe("Group D Runner-up")
  })

  it("formats best-3rd-place slot", () => {
    expect(formatWorldCupPlaceholder("A3", "TBD", null)).toBe("Best 3rd Place Qualifier")
  })

  it("formats TBD qualifier slots", () => {
    expect(formatWorldCupPlaceholder("TBD2", "TBD", null)).toBe("TBD Qualifier 2")
    expect(formatWorldCupPlaceholder("TBD10", "TBD", null)).toBe("TBD Qualifier 10")
  })

  it("formats match winner slots", () => {
    expect(formatWorldCupPlaceholder("W-M5", "TBD", null)).toBe("Winner Match 5")
  })

  it("formats match loser slots", () => {
    expect(formatWorldCupPlaceholder("L-M3", "TBD", null)).toBe("Loser Match 3")
  })

  it("returns the teamName as-is when a real team is set", () => {
    expect(formatWorldCupPlaceholder("A1", "Brazil", 10)).toBe("Brazil")
  })

  it("falls back to TBD for unrecognised slot keys", () => {
    expect(formatWorldCupPlaceholder("UNKNOWN", "TBD", null)).toBe("TBD")
  })
})

describe("getBracketBlockReason", () => {
  it("returns ended message for final status", () => {
    expect(
      getBracketBlockReason({
        inviteCode: "INV1",
        challengeId: "wc1",
        name: "Challenge",
        ownerName: "Owner",
        seasonYear: 2026,
        participantCount: 3,
        status: "final",
      })
    ).toBe("This bracket challenge has ended.")
  })

  it("returns locked message for locked status", () => {
    expect(
      getBracketBlockReason({
        inviteCode: "INV1",
        challengeId: "wc1",
        name: "Challenge",
        ownerName: "Owner",
        seasonYear: 2026,
        participantCount: 3,
        status: "locked",
      })
    ).toBe("This bracket is locked — picks are no longer accepted.")
  })

  it("returns null for open status", () => {
    expect(
      getBracketBlockReason({
        inviteCode: "INV1",
        challengeId: "wc1",
        name: "Challenge",
        ownerName: "Owner",
        seasonYear: 2026,
        participantCount: 3,
        status: "open",
      })
    ).toBeNull()
  })
})

describe("mapJoinError", () => {
  it("maps duplicate participant error", () => {
    expect(mapJoinError("duplicate participant")).toBe("You have already joined this bracket.")
  })

  it("maps locked error", () => {
    expect(mapJoinError("locked")).toBe("This bracket is locked — picks are no longer accepted.")
  })

  it("maps full error", () => {
    expect(mapJoinError("challenge is full")).toBe("This bracket is full.")
  })

  it("returns a generic fallback for unknown errors", () => {
    const result = mapJoinError("some unexpected error")
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })
})

describe("World Cup pick readiness guards", () => {
  it("returns fixtures_not_synced when matches are empty", () => {
    expect(getWorldCupGuidedPicksState([])).toBe("fixtures_not_synced")
  })

  it("returns fixtures_not_ready when matches exist without real team IDs", () => {
    const unresolved = [
      makeMatch({
        homeTeamId: null,
        awayTeamId: null,
        homeTeamName: "A1",
        awayTeamName: "B2",
      }),
    ]
    expect(getWorldCupGuidedPicksState(unresolved)).toBe("fixtures_not_ready")
  })

  it("returns ready when at least one pickable match exists", () => {
    expect(getWorldCupGuidedPicksState([makeMatch()])).toBe("ready")
  })

  it("moves from fixtures_not_ready to ready when first-round matches get team IDs", () => {
    const unresolvedFirstRound = Array.from({ length: 16 }, (_, idx) =>
      makeMatch({
        id: `m-${idx + 1}`,
        matchNumber: idx + 1,
        round: "round_of_32",
        homeTeamId: null,
        awayTeamId: null,
        homeTeamName: `A${idx + 1}`,
        awayTeamName: `B${idx + 1}`,
      })
    )
    expect(getWorldCupGuidedPicksState(unresolvedFirstRound)).toBe("fixtures_not_ready")

    const resolvedFirstRound = unresolvedFirstRound.map((match, idx) => ({
      ...match,
      homeTeamId: `demo-home-${idx + 1}`,
      awayTeamId: `demo-away-${idx + 1}`,
      homeTeamName: `Home ${idx + 1}`,
      awayTeamName: `Away ${idx + 1}`,
    }))

    const pickableCount = resolvedFirstRound.filter((m) => isWorldCupMatchPickable(m)).length
    expect(pickableCount).toBe(16)
    expect(getWorldCupGuidedPicksState(resolvedFirstRound)).toBe("ready")
  })

  it("reports missing_home_team reason for unresolved home team", () => {
    const match = makeMatch({ homeTeamId: null })
    expect(getWorldCupUnpickableReason(match)).toBe("missing_home_team")
    expect(isWorldCupMatchPickable(match)).toBe(false)
  })

  it("reports missing_away_team reason for unresolved away team", () => {
    const match = makeMatch({ awayTeamId: null })
    expect(getWorldCupUnpickableReason(match)).toBe("missing_away_team")
    expect(isWorldCupMatchPickable(match)).toBe(false)
  })

  it("throws clear guided save error when selectedTeamId is missing", () => {
    expect(() =>
      assertWorldCupPickPayloadReady({
        selectedTeamId: null,
      })
    ).toThrow("This matchup is not ready for picks yet.")
  })
})

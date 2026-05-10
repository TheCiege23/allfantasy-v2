import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import path from "path"
import {
  getBracketBlockReason,
  mapJoinError,
  formatWorldCupPlaceholder,
} from "@/lib/world-cup/worldCupBracketUtils"
import {
  getFlagUrlForCountryCode,
  normalizeWorldCupTeamSeedRow,
  validateTeamSeedRow,
} from "@/lib/world-cup/worldCupSeedData"
import { buildWorldCupDemoRoundOf32Fixtures } from "@/lib/world-cup/worldCupTestFixtures"
import { isWorldCupChallengeLocked } from "@/lib/world-cup/worldCupBracketBuilder"
import {
  assertWorldCupPickPayloadReady,
  buildWorldCupProjectedMatches,
  countRemainingPicks,
  findFirstUnpickedMatch,
  getInvalidDownstreamPickIds,
  getOrderedRounds,
  getWorldCupGuidedPicksState,
  getWorldCupUnpickableReason,
  hasWorldCupPickSelection,
  isBracketComplete,
  isWorldCupMatchPickable,
} from "@/lib/world-cup/worldCupProjectedBracket"
import type { WorldCupMatchView, WorldCupPickView } from "@/lib/world-cup/types"

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

function makePick(overrides: Partial<WorldCupPickView> = {}): WorldCupPickView {
  return {
    id: "p1",
    matchId: "m1",
    round: "round_of_32",
    selectedTeamId: "team-a",
    selectedSlotKey: "A1",
    selectedTeamName: "Argentina",
    pointsAwarded: 0,
    isCorrect: null,
    lockedAt: null,
    ...overrides,
  }
}

describe("formatWorldCupPlaceholder", () => {
  it("formats group winner slots", () => {
    expect(formatWorldCupPlaceholder("A1", "TBD", null)).toBe("Winner Group A")
    expect(formatWorldCupPlaceholder("H1", "TBD", null)).toBe("Winner Group H")
  })

  it("formats group runner-up slots", () => {
    expect(formatWorldCupPlaceholder("B2", "TBD", null)).toBe("Runner-up Group B")
    expect(formatWorldCupPlaceholder("D2", "TBD", null)).toBe("Runner-up Group D")
  })

  it("formats best-3rd-place slot", () => {
    expect(formatWorldCupPlaceholder("A3", "TBD", null)).toBe("Best 3rd Place")
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

describe("World Cup team and fixture seed readiness", () => {
  it("normalizes team seed rows with code, flag, group, seed, and ranking metadata", () => {
    const normalized = normalizeWorldCupTeamSeedRow({
      countryName: "United States",
      abbreviation: "USA",
      countryCode: "us",
      displayName: "USA",
      flagEmoji: "🇺🇸",
      group: "D",
      seed: 9,
      ranking: 11,
    })

    expect(validateTeamSeedRow({ countryName: "USA", fifaCode: "USA", groupName: "D", seed: 9 }).ok).toBe(true)
    expect(normalized).toMatchObject({
      fifaCode: "USA",
      countryName: "USA",
      displayName: "USA",
      flagUrl: "https://flagcdn.com/w80/us.png",
      flagEmoji: "🇺🇸",
      groupName: "D",
      seed: 9,
      ranking: 11,
    })
  })

  it("builds flag asset URLs from FIFA codes used by the bracket", () => {
    expect(getFlagUrlForCountryCode("ENG")).toBe("https://flagcdn.com/w80/gb-eng.png")
    expect(getFlagUrlForCountryCode("ARG")).toBe("https://flagcdn.com/w80/ar.png")
  })

  it("mock fixture seed creates pickable round-of-32 matchups with teams, dates, and venues", () => {
    const matches = Array.from({ length: 31 }, (_, idx) =>
      makeMatch({
        id: `m-${idx + 1}`,
        matchNumber: idx + 1,
        round: idx < 16 ? "round_of_32" : "round_of_16",
        homeTeamId: null,
        awayTeamId: null,
        homeTeamName: "TBD",
        awayTeamName: "TBD",
        startsAt: null,
      })
    )
    const patches = buildWorldCupDemoRoundOf32Fixtures(matches)
    const patched = matches.map((match) => {
      const patch = patches.find((row) => row.matchId === match.id)
      return patch ? { ...match, ...patch.data } : match
    })

    expect(patches).toHaveLength(16)
    expect(patches[0].home).toMatchObject({ name: "Brazil", fifaCode: "BRA", groupName: "A", seed: 1 })
    expect(patches[0].data.venueName).toBeTruthy()
    expect(patches[0].data.startsAt).toBeInstanceOf(Date)
    expect(patched.filter(isWorldCupMatchPickable)).toHaveLength(16)
    expect(patched.filter((match) => !match.homeTeamId || !match.awayTeamId)).toHaveLength(15)
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
  it("treats a bracket as unlocked before the challenge lock time", () => {
    const lock = isWorldCupChallengeLocked({
      challenge: {
        pickLockStrategy: "tournament_start",
        pickLockAt: "2026-07-01T16:00:00Z",
        status: "open",
      },
      now: new Date("2026-07-01T15:59:59Z"),
    })

    expect(lock.locked).toBe(false)
  })

  it("treats a bracket as locked when current time reaches lockAt", () => {
    const lock = isWorldCupChallengeLocked({
      challenge: {
        pickLockStrategy: "per_match",
        pickLockAt: "2026-07-01T16:00:00Z",
        status: "open",
      },
      now: new Date("2026-07-01T16:00:00Z"),
    })

    expect(lock.locked).toBe(true)
    expect(lock.reason).toBe("tournament_started")
  })

  it("does not seed pick rows during entry creation", () => {
    const source = readFileSync(
      path.join(process.cwd(), "lib/world-cup/worldCupBracketService.ts"),
      "utf8"
    )
    const createEntrySource = source.slice(
      source.indexOf("export async function createWorldCupBracketEntry"),
      source.indexOf("export async function renameWorldCupBracketEntry")
    )

    expect(createEntrySource).not.toMatch(/worldCupBracketPick\.(create|createMany|upsert)/)
  })

  it("treats a new bracket as 0 completed picks", () => {
    const matches = [makeMatch()]
    const picks: WorldCupPickView[] = []

    expect(picks.filter(hasWorldCupPickSelection).length).toBe(0)
    expect(countRemainingPicks(matches, picks)).toBe(1)
    expect(isBracketComplete(matches, picks)).toBe(false)
  })

  it("does not count placeholder pick rows as completed picks", () => {
    const matches = [makeMatch()]
    const placeholderPick = makePick({
      selectedTeamId: null,
      selectedSlotKey: null,
      selectedTeamName: "TBD",
    })

    expect(hasWorldCupPickSelection(placeholderPick)).toBe(false)
    expect(countRemainingPicks(matches, [placeholderPick])).toBe(1)
    expect(isBracketComplete(matches, [placeholderPick])).toBe(false)
  })

  it("starts the guided picker at the first pickable unpicked matchup", () => {
    const matches = [
      makeMatch({ id: "m1", matchNumber: 1 }),
      makeMatch({
        id: "m2",
        matchNumber: 2,
        homeTeamId: "team-c",
        awayTeamId: "team-d",
        homeTeamName: "France",
        awayTeamName: "Germany",
        homeSlotKey: "C1",
        awaySlotKey: "D2",
      }),
    ]
    const orderedRounds = getOrderedRounds(matches)

    expect(
      findFirstUnpickedMatch(
        matches,
        [makePick({ selectedTeamId: null, selectedSlotKey: null })],
        orderedRounds
      )?.id
    ).toBe("m1")

    expect(
      findFirstUnpickedMatch(
        matches,
        [makePick({ matchId: "m1", selectedTeamId: "team-a", selectedSlotKey: "A1" })],
        orderedRounds
      )?.id
    ).toBe("m2")
  })

  it("does not mark a bracket complete until real selections exist", () => {
    const matches = [makeMatch()]

    expect(
      isBracketComplete(matches, [
        makePick({ selectedTeamId: null, selectedSlotKey: null }),
      ])
    ).toBe(false)

    expect(
      isBracketComplete(matches, [
        makePick({ selectedTeamId: null, selectedSlotKey: "A1" }),
      ])
    ).toBe(true)
  })

  it("clears downstream picks from the selected entry pick list only", () => {
    const finalMatch = makeMatch({
      id: "m3",
      round: "round_of_16",
      roundIndex: 2,
      matchNumber: 3,
      homeSlotKey: "W-M1",
      awaySlotKey: "W-M2",
      homeTeamId: "team-a",
      awayTeamId: "team-c",
      homeTeamName: "Argentina",
      awayTeamName: "France",
    })
    const matches = [
      makeMatch({ id: "m1", matchNumber: 1, nextMatchId: "m3", nextMatchSlot: "home" }),
      makeMatch({
        id: "m2",
        matchNumber: 2,
        homeSlotKey: "C1",
        awaySlotKey: "D2",
        homeTeamId: "team-c",
        awayTeamId: "team-d",
        homeTeamName: "France",
        awayTeamName: "Germany",
        nextMatchId: "m3",
        nextMatchSlot: "away",
      }),
      finalMatch,
    ]
    const selectedEntryPicks = [
      makePick({ id: "entry-1-r32", matchId: "m1", selectedTeamId: "team-a" }),
      makePick({
        id: "entry-1-downstream",
        matchId: "m3",
        round: "round_of_16",
        selectedTeamId: "team-a",
        selectedSlotKey: "W-M1",
      }),
    ]
    const otherEntryPicks = [
      makePick({ id: "entry-2-r32", matchId: "m1", selectedTeamId: "team-b", selectedSlotKey: "B2" }),
      makePick({
        id: "entry-2-downstream",
        matchId: "m3",
        round: "round_of_16",
        selectedTeamId: "team-c",
        selectedSlotKey: "W-M2",
      }),
    ]

    expect(getInvalidDownstreamPickIds(matches, selectedEntryPicks, "m1", "team-b")).toEqual([
      "entry-1-downstream",
    ])
    expect(getInvalidDownstreamPickIds(matches, otherEntryPicks, "m1", "team-b")).toEqual([])
  })

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

  it("allows a slot-key selection to count as a real guided pick", () => {
    expect(() =>
      assertWorldCupPickPayloadReady({
        selectedTeamId: null,
        selectedSlotKey: "W-M1",
      })
    ).not.toThrow()
  })

  it("rehydrates saved picks as completed selections after refresh", () => {
    const matches = [makeMatch()]
    const savedPicks = [makePick()]

    expect(savedPicks.filter(hasWorldCupPickSelection)).toHaveLength(1)
    expect(countRemainingPicks(matches, savedPicks)).toBe(0)
  })

  it("rehydrates projected next-round winners from saved picks after refresh", () => {
    const matches = [
      makeMatch({ id: "m1", matchNumber: 1, nextMatchId: "m3", nextMatchSlot: "home" }),
      makeMatch({
        id: "m2",
        matchNumber: 2,
        homeSlotKey: "C1",
        awaySlotKey: "D2",
        homeTeamId: "team-c",
        awayTeamId: "team-d",
        homeTeamName: "France",
        awayTeamName: "Japan",
        nextMatchId: "m3",
        nextMatchSlot: "away",
      }),
      makeMatch({
        id: "m3",
        round: "round_of_16",
        roundIndex: 2,
        matchNumber: 3,
        homeSlotKey: "W-M1",
        awaySlotKey: "W-M2",
        homeTeamId: null,
        awayTeamId: null,
        homeTeamName: "TBD",
        awayTeamName: "TBD",
      }),
    ]
    const savedPicks = [
      makePick({ id: "p-m1", matchId: "m1", selectedTeamId: "team-a", selectedSlotKey: "A1", selectedTeamName: "Argentina" }),
      makePick({ id: "p-m2", matchId: "m2", selectedTeamId: "team-d", selectedSlotKey: "D2", selectedTeamName: "Japan" }),
    ]

    const projected = buildWorldCupProjectedMatches(matches, savedPicks)
    const nextRound = projected.find((match) => match.id === "m3")

    expect(nextRound?.homeTeamName).toBe("Argentina")
    expect(nextRound?.awayTeamName).toBe("Japan")
    expect(isWorldCupMatchPickable(nextRound!)).toBe(true)
  })

  it("overlays saved picks without dropping seeded base matches", () => {
    const matches = [
      makeMatch({ id: "m1", matchNumber: 1, nextMatchId: "m17", nextMatchSlot: "home" }),
      makeMatch({
        id: "m2",
        matchNumber: 2,
        homeSlotKey: "C1",
        awaySlotKey: "D2",
        homeTeamId: "team-c",
        awayTeamId: "team-d",
        homeTeamName: "France",
        awayTeamName: "Japan",
        nextMatchId: "m17",
        nextMatchSlot: "away",
      }),
      makeMatch({
        id: "m17",
        round: "round_of_16",
        roundIndex: 1,
        matchNumber: 17,
        homeSlotKey: "W-M1",
        awaySlotKey: "W-M2",
        homeTeamId: null,
        awayTeamId: null,
        homeTeamName: "Winner Match 1",
        awayTeamName: "Winner Match 2",
      }),
    ]
    const savedPicks = [
      makePick({
        id: "p-m1",
        matchId: "m1",
        selectedTeamId: "team-a",
        selectedSlotKey: "A1",
        selectedTeamName: "Argentina",
      }),
    ]

    const projected = buildWorldCupProjectedMatches(matches, savedPicks)

    expect(projected.map((match) => match.id)).toEqual(["m1", "m2", "m17"])
    expect(projected.find((match) => match.id === "m1")?.homeTeamName).toBe("Argentina")
    expect(projected.find((match) => match.id === "m2")?.homeTeamName).toBe("France")
    expect(projected.find((match) => match.id === "m17")?.homeTeamName).toBe("Argentina")
    expect(findFirstUnpickedMatch(projected, savedPicks, getOrderedRounds(projected))?.id).toBe("m2")
  })

  it("keeps an incomplete saved bracket incomplete after refresh", () => {
    const matches = [
      makeMatch({ id: "m1", matchNumber: 1, nextMatchId: "m3", nextMatchSlot: "home" }),
      makeMatch({
        id: "m2",
        matchNumber: 2,
        homeSlotKey: "C1",
        awaySlotKey: "D2",
        homeTeamId: "team-c",
        awayTeamId: "team-d",
        homeTeamName: "France",
        awayTeamName: "Japan",
        nextMatchId: "m3",
        nextMatchSlot: "away",
      }),
      makeMatch({
        id: "m3",
        round: "round_of_16",
        roundIndex: 2,
        matchNumber: 3,
        homeSlotKey: "W-M1",
        awaySlotKey: "W-M2",
        homeTeamId: null,
        awayTeamId: null,
        homeTeamName: "TBD",
        awayTeamName: "TBD",
      }),
    ]
    const savedPicks = [makePick({ id: "p-m1", matchId: "m1" })]
    const projected = buildWorldCupProjectedMatches(matches, savedPicks)

    expect(isBracketComplete(projected, savedPicks)).toBe(false)
    expect(countRemainingPicks(projected.filter(isWorldCupMatchPickable), savedPicks)).toBe(1)
  })

  it("keeps a completed saved bracket complete only when all required real selections exist", () => {
    const matches = [
      makeMatch({ id: "m1", matchNumber: 1, nextMatchId: "m3", nextMatchSlot: "home" }),
      makeMatch({
        id: "m2",
        matchNumber: 2,
        homeSlotKey: "C1",
        awaySlotKey: "D2",
        homeTeamId: "team-c",
        awayTeamId: "team-d",
        homeTeamName: "France",
        awayTeamName: "Japan",
        nextMatchId: "m3",
        nextMatchSlot: "away",
      }),
      makeMatch({
        id: "m3",
        round: "round_of_16",
        roundIndex: 2,
        matchNumber: 3,
        homeSlotKey: "W-M1",
        awaySlotKey: "W-M2",
        homeTeamId: null,
        awayTeamId: null,
        homeTeamName: "TBD",
        awayTeamName: "TBD",
      }),
    ]
    const savedPicks = [
      makePick({ id: "p-m1", matchId: "m1", selectedTeamId: "team-a", selectedSlotKey: "A1", selectedTeamName: "Argentina" }),
      makePick({ id: "p-m2", matchId: "m2", selectedTeamId: "team-d", selectedSlotKey: "D2", selectedTeamName: "Japan" }),
      makePick({
        id: "p-m3",
        matchId: "m3",
        round: "round_of_16",
        selectedTeamId: "team-a",
        selectedSlotKey: "A1",
        selectedTeamName: "Argentina",
      }),
    ]
    const projected = buildWorldCupProjectedMatches(matches, savedPicks)

    expect(isBracketComplete(projected, savedPicks)).toBe(true)
    expect(
      isBracketComplete(projected, [
        ...savedPicks.slice(0, 2),
        makePick({
          id: "placeholder",
          matchId: "m3",
          round: "round_of_16",
          selectedTeamId: null,
          selectedSlotKey: null,
          selectedTeamName: "TBD",
        }),
      ])
    ).toBe(false)
  })

  it("keeps saved picks scoped to the active entry when switching entries", () => {
    const matches = [makeMatch()]
    const entryPicks: Record<string, WorldCupPickView[]> = {
      "entry-1": [makePick({ id: "entry-1-pick", selectedTeamId: "team-a", selectedSlotKey: "A1" })],
      "entry-2": [makePick({ id: "entry-2-pick", selectedTeamId: "team-b", selectedSlotKey: "B2", selectedTeamName: "Brazil" })],
    }

    expect(entryPicks["entry-1"]).toHaveLength(1)
    expect(entryPicks["entry-2"]).toHaveLength(1)
    expect(entryPicks["entry-1"][0].selectedTeamId).toBe("team-a")
    expect(entryPicks["entry-2"][0].selectedTeamId).toBe("team-b")
    expect(isBracketComplete(matches, entryPicks["entry-1"])).toBe(true)
    expect(isBracketComplete(matches, entryPicks["entry-2"])).toBe(true)
  })

  it("keeps each of 5 saved bracket pick lists independent", () => {
    const entryPicks = Object.fromEntries(
      Array.from({ length: 5 }, (_, idx) => [
        `entry-${idx + 1}`,
        [
          makePick({
            id: `entry-${idx + 1}-pick`,
            matchId: `m${idx + 1}`,
            selectedTeamId: `team-${idx + 1}`,
            selectedSlotKey: `S${idx + 1}`,
            selectedTeamName: `Team ${idx + 1}`,
          }),
        ],
      ])
    ) as Record<string, WorldCupPickView[]>

    expect(Object.keys(entryPicks)).toHaveLength(5)
    for (let idx = 1; idx <= 5; idx += 1) {
      expect(entryPicks[`entry-${idx}`]).toHaveLength(1)
      expect(entryPicks[`entry-${idx}`][0].matchId).toBe(`m${idx}`)
      expect(entryPicks[`entry-${idx}`][0].selectedTeamId).toBe(`team-${idx}`)
    }
  })

  it("fixtures_not_ready state has no pickable matches until team IDs are set", () => {
    // Simulates the state shown to the user before Load Test Fixtures runs
    const bracketMatches = Array.from({ length: 31 }, (_, idx) =>
      makeMatch({
        id: `m-${idx + 1}`,
        matchNumber: idx + 1,
        round: idx < 16 ? "round_of_32" : idx < 24 ? "round_of_16" : idx < 28 ? "quarterfinal" : idx < 30 ? "semifinal" : "final",
        homeTeamId: null,
        awayTeamId: null,
        homeTeamName: `TBD-H${idx + 1}`,
        awayTeamName: `TBD-A${idx + 1}`,
      })
    )
    expect(getWorldCupGuidedPicksState(bracketMatches)).toBe("fixtures_not_ready")
    expect(bracketMatches.filter((m) => isWorldCupMatchPickable(m)).length).toBe(0)

    // After Load Test Fixtures patches Round of 32 matches with real team IDs
    const after = bracketMatches.map((m, idx) =>
      idx < 16
        ? { ...m, homeTeamId: `demo-home-${idx + 1}`, awayTeamId: `demo-away-${idx + 1}`, homeTeamName: `Team ${idx * 2 + 1}`, awayTeamName: `Team ${idx * 2 + 2}`, apiStatusShort: "TEST" }
        : m
    )
    expect(getWorldCupGuidedPicksState(after)).toBe("ready")
    expect(after.filter((m) => isWorldCupMatchPickable(m)).length).toBe(16)
  })
})

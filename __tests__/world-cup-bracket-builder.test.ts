import { describe, expect, it } from "vitest"
import {
  DEFAULT_WORLD_CUP_SCORING,
  buildWorldCupBracketTemplate,
  getWorldCupRoundPoints,
  isWorldCupMatchLocked,
} from "@/lib/world-cup/worldCupBracketBuilder"

describe("World Cup bracket builder", () => {
  it("builds a 2026 knockout bracket with placeholders", () => {
    const bracket = buildWorldCupBracketTemplate()
    expect(bracket.slots).toHaveLength(32)
    expect(bracket.matches).toHaveLength(31)
    expect(bracket.slots.every((slot) => slot.isPlaceholder)).toBe(true)
    expect(bracket.matches.filter((match) => match.round === "round_of_32")).toHaveLength(16)
    expect(bracket.matches.find((match) => match.matchNumber === 31)?.round).toBe("final")
  })

  it("supports an optional third-place match", () => {
    const bracket = buildWorldCupBracketTemplate({ includeThirdPlace: true })
    expect(bracket.matches).toHaveLength(32)
    expect(bracket.matches.find((match) => match.round === "third_place")).toBeTruthy()
  })

  it("maps escalating round scores", () => {
    expect(getWorldCupRoundPoints("round_of_32", DEFAULT_WORLD_CUP_SCORING)).toBe(10)
    expect(getWorldCupRoundPoints("round_of_16", DEFAULT_WORLD_CUP_SCORING)).toBe(20)
    expect(getWorldCupRoundPoints("quarterfinal", DEFAULT_WORLD_CUP_SCORING)).toBe(40)
    expect(getWorldCupRoundPoints("semifinal", DEFAULT_WORLD_CUP_SCORING)).toBe(80)
    expect(getWorldCupRoundPoints("final", DEFAULT_WORLD_CUP_SCORING)).toBe(160)
  })

  it("locks by matchup kickoff or tournament lock time", () => {
    const now = new Date("2026-07-01T12:00:00Z")
    expect(
      isWorldCupMatchLocked({
        startsAt: "2026-07-01T11:59:00Z",
        pickLockStrategy: "per_match",
        now,
      })
    ).toBe(true)
    expect(
      isWorldCupMatchLocked({
        startsAt: "2026-07-01T12:01:00Z",
        pickLockStrategy: "per_match",
        now,
      })
    ).toBe(false)
    expect(
      isWorldCupMatchLocked({
        pickLockStrategy: "tournament_start",
        pickLockAt: "2026-06-11T00:00:00Z",
        now,
      })
    ).toBe(true)
  })

  it("infers tournament-start lock from earliest match when pickLockAt is unset", () => {
    const now = new Date("2026-07-15T12:00:00Z")
    expect(
      isWorldCupMatchLocked({
        challenge: { pickLockStrategy: "tournament_start", pickLockAt: null, status: "open" },
        match: { startsAt: "2026-07-20T12:00:00Z", status: "scheduled" },
        matches: [
          { startsAt: "2026-07-20T12:00:00Z", status: "scheduled" },
          { startsAt: "2026-07-21T12:00:00Z", status: "scheduled" },
        ],
        now,
      })
    ).toBe(false)
    expect(
      isWorldCupMatchLocked({
        challenge: { pickLockStrategy: "tournament_start", pickLockAt: null, status: "open" },
        match: { startsAt: "2026-07-20T12:00:00Z", status: "scheduled" },
        matches: [{ startsAt: "2026-07-10T15:00:00Z", status: "scheduled" }],
        now,
      })
    ).toBe(true)
  })
})

import { describe, expect, it } from "vitest"
import * as routing from "@/lib/playoffs/playoffHomeRouting"

describe("playoff home card routing", () => {
  it("exports resolvePlayoffCardHref as a function", () => {
    expect(typeof routing.resolvePlayoffCardHref).toBe("function")
  })

  it("routes existing NBA challenge card to dashboard route", () => {
    const href = routing.resolvePlayoffCardHref({
      sport: "NBA",
      playoffBySport: new Map([
        [
          "nba",
          {
            challengeId: "challenge-nba",
            sport: "nba",
          },
        ],
      ]),
    })

    expect(href).toBe("/brackets/leagues/challenge-nba")
    expect(
      routing.resolvePlayoffCardMode({
        sport: "NBA",
        playoffBySport: new Map([["nba", { challengeId: "challenge-nba", sport: "nba" }]]),
      })
    ).toBe("open")
  })

  it("falls back to /brackets when no NHL challenge exists", () => {
    const href = routing.resolvePlayoffCardHref({
      sport: "NHL",
      playoffBySport: new Map(),
    })

    expect(href).toBe("/brackets")
    expect(routing.resolvePlayoffCardMode({ sport: "NHL", playoffBySport: new Map() })).toBe("create")
  })

  it("resolves My Pools NBA card href to dashboard route", () => {
    const href = routing.resolveMyPoolCardHref({
      poolId: "league-nba",
      sport: "NBA",
      challengeType: "playoff_challenge",
      bracketType: null,
      playoffBySport: new Map([["nba", { challengeId: "challenge-nba-1", sport: "nba" }]]),
    })

    expect(href).toBe("/brackets/leagues/challenge-nba-1")
  })

  it("resolves My Pools NHL card href to dashboard route", () => {
    const href = routing.resolveMyPoolCardHref({
      poolId: "league-nhl",
      sport: "NHL",
      challengeType: "playoff_challenge",
      bracketType: null,
      playoffBySport: new Map([["nhl", { challengeId: "challenge-nhl-1", sport: "nhl" }]]),
    })

    expect(href).toBe("/brackets/leagues/challenge-nhl-1")
  })

  it("resolves My Pools Soccer card href to dashboard route using persisted pool id", () => {
    const href = routing.resolveMyPoolCardHref({
      poolId: "league-soccer-1",
      sport: "SOCCER",
      challengeType: "playoff_challenge",
      bracketType: null,
      playoffBySport: new Map(),
    })

    expect(href).toBe("/brackets/leagues/league-soccer-1")
    expect(href).not.toContain("sport=soccer")
  })

  it("returns /brackets for malformed input and never throws", () => {
    expect(routing.resolvePlayoffCardHref({ sport: "", playoffBySport: new Map() } as any)).toBe("/brackets")
    expect(routing.resolveMyPoolCardHref({} as any)).toBe("/brackets")
  })
})

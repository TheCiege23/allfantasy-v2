import { describe, expect, it } from "vitest"
import { resolveMyPoolCardHref, resolvePlayoffCardHref, resolvePlayoffCardMode } from "@/lib/playoffs/playoffHomeRouting"

describe("playoff home card routing", () => {
  it("routes existing NBA challenge card to dashboard route", () => {
    const href = resolvePlayoffCardHref({
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

    expect(href).toBe("/brackets/playoffs/challenge-nba")
    expect(
      resolvePlayoffCardMode({
        sport: "NBA",
        playoffBySport: new Map([["nba", { challengeId: "challenge-nba", sport: "nba" }]]),
      })
    ).toBe("open")
  })

  it("routes to create page when no NHL challenge exists", () => {
    const href = resolvePlayoffCardHref({
      sport: "NHL",
      playoffBySport: new Map(),
    })

    expect(href).toBe("/brackets/playoffs/create?sport=nhl")
    expect(resolvePlayoffCardMode({ sport: "NHL", playoffBySport: new Map() })).toBe("create")
  })

  it("resolves My Pools NBA card href to dashboard route", () => {
    const href = resolveMyPoolCardHref({
      poolId: "league-nba",
      sport: "NBA",
      challengeType: "playoff_challenge",
      bracketType: null,
      playoffBySport: new Map([["nba", { challengeId: "challenge-nba-1", sport: "nba" }]]),
    })

    expect(href).toBe("/brackets/playoffs/challenge-nba-1")
  })

  it("resolves My Pools NHL card href to dashboard route", () => {
    const href = resolveMyPoolCardHref({
      poolId: "league-nhl",
      sport: "NHL",
      challengeType: "playoff_challenge",
      bracketType: null,
      playoffBySport: new Map([["nhl", { challengeId: "challenge-nhl-1", sport: "nhl" }]]),
    })

    expect(href).toBe("/brackets/playoffs/challenge-nhl-1")
  })

  it("resolves My Pools Soccer card href to dashboard route using persisted pool id", () => {
    const href = resolveMyPoolCardHref({
      poolId: "league-soccer-1",
      sport: "SOCCER",
      challengeType: "playoff_challenge",
      bracketType: null,
      playoffBySport: new Map(),
    })

    expect(href).toBe("/brackets/playoffs/league-soccer-1")
    expect(href).not.toContain("sport=soccer")
  })
})

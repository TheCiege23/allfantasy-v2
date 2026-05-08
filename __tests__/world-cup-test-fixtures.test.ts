import { describe, it, expect } from "vitest"
import {
  WORLD_CUP_DEMO_TEAMS,
  buildWorldCupDemoRoundOf32Fixtures,
  getWorldCupDemoStartTime,
} from "@/lib/world-cup/worldCupTestFixtures"

describe("worldCupTestFixtures", () => {
  it("exports 32 demo teams", () => {
    expect(WORLD_CUP_DEMO_TEAMS).toHaveLength(32)
  })

  it("each team has required properties", () => {
    WORLD_CUP_DEMO_TEAMS.forEach((team) => {
      expect(team.id).toBeDefined()
      expect(team.name).toBeDefined()
      expect(team.fifaCode).toBeDefined()
      expect(team.flagUrl).toBeDefined()
      expect(team.seed).toBeGreaterThan(0)
    })
  })

  it("team IDs are unique", () => {
    const ids = WORLD_CUP_DEMO_TEAMS.map((t) => t.id)
    expect(new Set(ids).size).toBe(32)
  })

  it("buildWorldCupDemoRoundOf32Fixtures assigns 32 teams across 16 first-round matches", () => {
    const matches = Array.from({ length: 31 }, (_, idx) => ({
      id: `m${idx + 1}`,
      round: idx < 16 ? "round_of_32" : idx < 24 ? "round_of_16" : idx < 28 ? "quarterfinal" : idx < 30 ? "semifinal" : "final",
      roundIndex: idx < 16 ? 1 : idx < 24 ? 2 : idx < 28 ? 3 : idx < 30 ? 4 : 5,
      matchNumber: idx + 1,
      homeTeamId: null,
      awayTeamId: null,
      homeTeamName: "TBD",
      awayTeamName: "TBD",
      startsAt: null,
    }))

    const patches = buildWorldCupDemoRoundOf32Fixtures(matches)
    expect(patches).toHaveLength(16)
    const uniqueTeamIds = new Set(patches.flatMap((p) => [p.home.id, p.away.id]))
    expect(uniqueTeamIds.size).toBe(32)

    const laterRoundIds = new Set(matches.slice(16).map((m) => m.id))
    expect(patches.some((p) => laterRoundIds.has(p.matchId))).toBe(false)
  })

  it("getWorldCupDemoStartTime returns future dates spread across 2 weeks", () => {
    const now = new Date()
    const times: Date[] = []

    for (let i = 0; i < 16; i++) {
      const time = getWorldCupDemoStartTime(i)
      expect(time.getTime()).toBeGreaterThan(now.getTime())
      times.push(time)
    }

    // Check that times are spread out (roughly 8 matches per day)
    const daysSet = new Set<number>()
    times.forEach((t) => {
      daysSet.add(Math.floor((t.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    })

    expect(daysSet.size).toBeGreaterThan(1) // Should span multiple days
    expect(daysSet.size).toBeLessThanOrEqual(3) // Should be roughly 2 weeks
  })
})

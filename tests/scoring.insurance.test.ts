import { describe, it, expect } from "vitest"
import { scoreFanCredEdge, type PickResult, type LeaguePickDistribution } from "../lib/brackets/scoring"

describe("scoreFanCredEdge insurance behavior", () => {
  const baseFlags = { upsetDeltaEnabled: false, leverageBonusEnabled: false, insuranceEnabled: true }
  const emptyDist: LeaguePickDistribution = {}

  it("awards full points for correct insured pick", () => {
    const picks: PickResult[] = [
      {
        nodeId: "n1",
        round: 2,
        pickedTeamName: "A",
        isCorrect: true,
        pickedSeed: 3,
        actualWinnerSeed: 3,
        opponentSeed: 6,
      },
    ]
    const { total, breakdown } = scoreFanCredEdge(picks, emptyDist, "n1", baseFlags)
    expect(total).toBeGreaterThan(0)
    expect(breakdown[0].insured).toBe(true)
  })

  it("awards half base points for incorrect insured pick", () => {
    const picks: PickResult[] = [
      {
        nodeId: "n2",
        round: 3,
        pickedTeamName: "A",
        isCorrect: false,
        pickedSeed: 5,
        actualWinnerSeed: 2,
        opponentSeed: 2,
      },
    ]
    const { total, breakdown } = scoreFanCredEdge(picks, emptyDist, "n2", baseFlags)
    expect(total).toBeGreaterThan(0)
    expect(total).toBeLessThan( edgePointsForRoundShim(3) )
    expect(breakdown[0].insured).toBe(true)
  })

  it("awards no extra insurance points when not insured", () => {
    const picks: PickResult[] = [
      {
        nodeId: "n3",
        round: 3,
        pickedTeamName: "A",
        isCorrect: false,
        pickedSeed: 5,
        actualWinnerSeed: 2,
        opponentSeed: 2,
      },
    ]
    const { total, breakdown } = scoreFanCredEdge(picks, emptyDist, "other", baseFlags)
    expect(total).toBe(0)
    expect(breakdown[0].insured).toBe(false)
  })
})

// local shim: keep in sync with edgePointsForRound defaults
function edgePointsForRoundShim(round: number): number {
  switch (round) {
    case 1: return 1
    case 2: return 2
    case 3: return 5
    case 4: return 10
    case 5: return 18
    case 6: return 30
    default: return 0
  }
}


import { describe, it, expect } from "vitest"
import { summarizeGlobalPopularity, summarizeLeaguePopularity } from "../lib/brackets/popularity"

describe("brackets.popularity helpers", () => {
  it("computes global popularity per node", () => {
    const picks = [
      { nodeId: "n1", teamName: "A", leagueId: "L1" },
      { nodeId: "n1", teamName: "A", leagueId: "L2" },
      { nodeId: "n1", teamName: "B", leagueId: "L1" },
      { nodeId: "n2", teamName: "C", leagueId: "L1" },
    ]

    const summary = summarizeGlobalPopularity(picks as any)
    const n1 = summary.get("n1")
    const n2 = summary.get("n2")

    expect(n1?.total).toBe(3)
    expect(n1?.perTeam.get("A")).toBe(2)
    expect(n1?.perTeam.get("B")).toBe(1)
    expect(n2?.total).toBe(1)
    expect(n2?.perTeam.get("C")).toBe(1)
  })

  it("computes league-scoped popularity", () => {
    const picks = [
      { nodeId: "n1", teamName: "A", leagueId: "L1" },
      { nodeId: "n1", teamName: "A", leagueId: "L1" },
      { nodeId: "n1", teamName: "B", leagueId: "L2" },
    ]

    const summary = summarizeLeaguePopularity(picks as any)
    const l1 = summary.get("L1:n1")
    const l2 = summary.get("L2:n1")

    expect(l1?.total).toBe(2)
    expect(l1?.perTeam.get("A")).toBe(2)
    expect(l2?.total).toBe(1)
    expect(l2?.perTeam.get("B")).toBe(1)
  })
})


import { describe, expect, it } from "vitest"
import { requestContractToUnified } from "@/lib/ai-tool-registry/request-adapter"

describe("requestContractToUnified", () => {
  it("builds psychology envelope with canonical feature key and sport normalization", () => {
    const unified = requestContractToUnified({
      tool: "psychological",
      sport: "soccer",
      leagueId: "lg-1",
      deterministicContext: {
        profile: { style: "aggressive" },
        evidence: ["trade frequency"],
      },
      leagueSettings: { scoring: "ppr" },
      userMessage: "Explain this profile safely.",
    })

    expect(unified.envelope.featureType).toBe("psychological")
    expect(unified.envelope.sport).toBe("SOCCER")
    expect(unified.envelope.hardConstraints).toEqual(
      expect.arrayContaining([
        "Explain only using the provided profile scores and evidence.",
        "Deterministic-first: never override hard engine outputs.",
      ])
    )
    expect(unified.mode).toBe("single_model")
  })

  it("maps simulation alias into matchup adapter and respects requested mode", () => {
    const unified = requestContractToUnified({
      tool: "simulation",
      sport: "NBA",
      deterministicContext: {
        matchupSummary: { spread: -2.5 },
        projections: { winProbability: 61 },
      },
      aiMode: "consensus",
      userMessage: "Explain this matchup edge.",
    })

    expect(unified.envelope.featureType).toBe("matchup")
    expect(unified.envelope.promptIntent).toBe("explain")
    expect(unified.mode).toBe("consensus")
  })

  it("forces single_model when a supported provider is explicitly requested", () => {
    const unified = requestContractToUnified({
      tool: "trade_analyzer",
      sport: "NFL",
      deterministicContext: {
        fairnessScore: 54,
        valueDelta: 110,
        sideATotalValue: 8400,
        sideBTotalValue: 8290,
      },
      provider: "deepseek",
      aiMode: "consensus",
      userMessage: "Break down this trade.",
    })

    expect(unified.mode).toBe("single_model")
    expect(unified.envelope.modelRoutingHints).toEqual(["deepseek"])
  })
})

import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import type { WorldCupMatchupIntelligence } from "@/lib/world-cup/types"

const getIntelMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/world-cup/worldCupClientApi", () => ({
  getWorldCupMatchupIntelligence: getIntelMock,
}))

const baseIntel = (): WorldCupMatchupIntelligence => ({
  matchId: "m1",
  recommendedTeamId: "t1",
  recommendedTeamName: "Brazil",
  recommendedSide: "home",
  homeWinProbability: 0.55,
  awayWinProbability: 0.45,
  confidence: "medium",
  upsetRisk: "medium",
  keyFactors: ["Knockout pace"],
  summary: "Deterministic summary text.",
  safePick: "Brazil",
  contrarianPick: "France",
  projectedScore: null,
  generative: false,
  safePickSide: "home",
  upsetPickSide: "away",
  safePickTeamName: "Brazil",
  upsetPickTeamName: "France",
  riskLevel: "medium",
  recentFormSummary: "Form placeholder.",
  rankingSeedComparison: "Seed notes.",
  bracketImpactIfHomeWins: "If Brazil wins…",
  bracketImpactIfAwayWins: "If France wins…",
  whyThisPickMakesSense: "Why text.",
  howRiskyIsThisPick: "Risk text.",
  whatThisMeansForYourBracket: "Bracket text.",
  narrativesGenerative: false,
})

describe("WorldCupMatchupIntelligencePanel AF Pro gating", () => {
  beforeEach(() => {
    getIntelMock.mockReset()
    getIntelMock.mockResolvedValue(baseIntel())
  })

  it("shows locked card and disables AI-only buttons when user does not have Bracket Brain AI", async () => {
    const WorldCupMatchupIntelligencePanel = (await import(
      "@/components/brackets/world-cup/WorldCupMatchupIntelligencePanel"
    )).default

    render(
      <WorldCupMatchupIntelligencePanel
        challengeId="c1"
        entryId="e1"
        matchId="m1"
        homeName="Brazil"
        awayName="France"
        disabled={false}
        hasBracketBrainAi={false}
        stagedSide={null}
        onStageSide={() => {}}
        onUseThisPick={() => {}}
      />
    )

    expect(await screen.findByTestId("wc-bracket-brain-locked-card")).toBeInTheDocument()
    expect(screen.getByTestId("wc-ai-ask-button")).toBeDisabled()
    expect(screen.getByTestId("wc-ai-explain-button")).toBeDisabled()
    expect(screen.getByText(/Basic stats \(non-AI\)/i)).toBeInTheDocument()
  })

  it("does not show locked card when user has Bracket Brain AI", async () => {
    const WorldCupMatchupIntelligencePanel = (await import(
      "@/components/brackets/world-cup/WorldCupMatchupIntelligencePanel"
    )).default

    render(
      <WorldCupMatchupIntelligencePanel
        challengeId="c1"
        entryId="e1"
        matchId="m1"
        homeName="Brazil"
        awayName="France"
        disabled={false}
        hasBracketBrainAi
        stagedSide={null}
        onStageSide={() => {}}
        onUseThisPick={() => {}}
      />
    )

    await screen.findByTestId("world-cup-matchup-intelligence-panel")
    expect(screen.queryByTestId("wc-bracket-brain-locked-card")).not.toBeInTheDocument()
    expect(screen.queryByText(/Basic stats \(non-AI\)/i)).not.toBeInTheDocument()
    expect(screen.getByTestId("wc-ai-ask-button")).not.toBeDisabled()
    expect(screen.getByTestId("wc-ai-explain-button")).not.toBeDisabled()
  })

  it("uses the shared flag fallback for matchup display", async () => {
    const WorldCupMatchupIntelligencePanel = (await import(
      "@/components/brackets/world-cup/WorldCupMatchupIntelligencePanel"
    )).default

    render(
      <WorldCupMatchupIntelligencePanel
        challengeId="c1"
        entryId="e1"
        matchId="m1"
        homeName="Brazil"
        awayName="France"
        homeLogo="https://flagcdn.com/w80/br.png"
        awayLogo={null}
        disabled={false}
        hasBracketBrainAi
        stagedSide={null}
        onStageSide={() => {}}
        onUseThisPick={() => {}}
      />
    )

    await screen.findByTestId("world-cup-matchup-intelligence-panel")
    expect(screen.getByAltText("Brazil flag")).toBeInTheDocument()
    expect(screen.getByLabelText("France country code FRA")).toBeInTheDocument()
  })
})

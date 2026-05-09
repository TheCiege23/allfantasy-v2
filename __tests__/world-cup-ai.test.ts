import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { openaiChatText } from "@/lib/openai-client"
import type { WorldCupMatchView } from "@/lib/world-cup/types"
import { buildWorldCupMatchupIntelligence } from "@/lib/world-cup/worldCupAIService"
import {
  getProbabilityBasedPickSides,
  describeBracketImpactIfTeamWins,
} from "@/lib/world-cup/worldCupPickStrategy"

vi.mock("@/lib/openai-client", () => ({
  openaiChatText: vi.fn().mockResolvedValue({
    ok: false,
    status: 503,
    details: "no ai",
    model: "x",
    baseUrl: "",
  }),
}))

const baseMatch = (): WorldCupMatchView => ({
  id: "m1",
  apiFixtureId: null,
  round: "round_of_32",
  roundIndex: 1,
  matchNumber: 1,
  homeSlotKey: "A1",
  awaySlotKey: "B2",
  homeTeamId: "t-home",
  awayTeamId: "t-away",
  homeTeamName: "Alpha",
  awayTeamName: "Beta",
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
  nextMatchId: "m2",
  nextMatchSlot: "home",
  elapsedMinute: null,
  injuryTime: null,
  period: null,
  venueName: null,
  venueCity: null,
  apiStatusShort: null,
  lastScoreSyncedAt: null,
})

describe("worldCupPickStrategy", () => {
  it("Pick Safe side follows higher win probability", () => {
    const m = baseMatch()
    const sides = getProbabilityBasedPickSides(m, 0.72, 0.28)
    expect(sides.safePickSide).toBe("home")
    expect(sides.upsetPickSide).toBe("away")
    expect(sides.safePickTeamName).toBe("Alpha")
    expect(sides.upsetPickTeamName).toBe("Beta")
  })

  it("Pick Upset side follows lower win probability", () => {
    const m = baseMatch()
    const sides = getProbabilityBasedPickSides(m, 0.28, 0.72)
    expect(sides.safePickSide).toBe("away")
    expect(sides.upsetPickSide).toBe("home")
  })

  it("describes bracket impact for a knockout win", () => {
    const text = describeBracketImpactIfTeamWins(baseMatch(), "home")
    expect(text).toContain("Alpha")
    expect(text.length).toBeGreaterThan(20)
  })
})

describe("worldCupAIService buildWorldCupMatchupIntelligence", () => {
  const prevKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  afterEach(() => {
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = prevKey
  })

  it("returns deterministic probabilities and aligned safe/upset sides without OpenAI", async () => {
    const intel = await buildWorldCupMatchupIntelligence({
      match: baseMatch(),
      strategy: "balanced",
      intent: "panel",
    })

    expect(intel.homeWinProbability).toBeGreaterThan(0)
    expect(intel.awayWinProbability).toBeGreaterThan(0)
    expect(intel.homeWinProbability + intel.awayWinProbability).toBeCloseTo(1, 1)

    const sides = getProbabilityBasedPickSides(
      baseMatch(),
      intel.homeWinProbability,
      intel.awayWinProbability
    )
    expect(intel.safePickSide).toBe(sides.safePickSide)
    expect(intel.upsetPickSide).toBe(sides.upsetPickSide)
    expect(intel.narrativesGenerative).toBe(false)
    expect(intel.whyThisPickMakesSense.length).toBeGreaterThan(10)
    expect(intel.howRiskyIsThisPick.length).toBeGreaterThan(10)
    expect(intel.whatThisMeansForYourBracket.length).toBeGreaterThan(10)
  })

  it("does not call OpenAI when bracketBrainAiEntitled is false even if OPENAI_API_KEY is set", async () => {
    process.env.OPENAI_API_KEY = "sk-test"
    const spy = vi.mocked(openaiChatText)

    await buildWorldCupMatchupIntelligence({
      match: baseMatch(),
      strategy: "balanced",
      intent: "panel",
      bracketBrainAiEntitled: false,
    })

    expect(spy).not.toHaveBeenCalled()

    await buildWorldCupMatchupIntelligence({
      match: baseMatch(),
      strategy: "balanced",
      intent: "explain",
      bracketBrainAiEntitled: false,
    })

    expect(spy).not.toHaveBeenCalled()
  })

  it("calls OpenAI for panel summary when entitled and key present", async () => {
    process.env.OPENAI_API_KEY = "sk-test"
    const spy = vi.mocked(openaiChatText)
    spy.mockResolvedValueOnce({
      ok: true,
      text: "Concise preview text that is long enough for the threshold.",
      status: 200,
      details: "",
      model: "gpt-4",
      baseUrl: "",
    })

    const intel = await buildWorldCupMatchupIntelligence({
      match: baseMatch(),
      strategy: "balanced",
      intent: "panel",
      bracketBrainAiEntitled: true,
    })

    expect(spy).toHaveBeenCalled()
    expect(intel.generative).toBe(true)
    expect(intel.summary.length).toBeGreaterThan(20)
  })
})

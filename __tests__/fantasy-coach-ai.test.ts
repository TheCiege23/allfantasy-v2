import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockOpenaiChatText, mockGetStrategyRecommendation } = vi.hoisted(() => ({
  mockOpenaiChatText: vi.fn(),
  mockGetStrategyRecommendation: vi.fn(),
}))

vi.mock("@/lib/openai-client", () => ({
  openaiChatText: mockOpenaiChatText,
}))

vi.mock("@/lib/fantasy-coach/StrategyRecommendationEngine", () => ({
  getStrategyRecommendation: mockGetStrategyRecommendation,
}))

import { getCoachAdvice } from "@/lib/fantasy-coach/FantasyCoachAI"

describe("FantasyCoachAI", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStrategyRecommendation.mockResolvedValue({
      type: "trade",
      summary: "Engine trade summary",
      bullets: ["Engine bullet one", "Engine bullet two"],
      actions: ["Send one trade offer this week"],
      contextSummary: "League: Test League. Week 8.",
    })
  })

  it("uses AI JSON response when available", async () => {
    mockOpenaiChatText.mockResolvedValue({
      ok: true,
      text: JSON.stringify({
        summary: "AI trade summary",
        bullets: ["AI bullet 1", "AI bullet 2"],
        challenge: "Offer your depth RB for WR upside.",
        tone: "motivational",
      }),
      model: "mock",
      baseUrl: "mock",
    })

    const result = await getCoachAdvice("trade", { week: 8 })
    expect(result).toEqual({
      type: "trade",
      summary: "AI trade summary",
      bullets: ["AI bullet 1", "AI bullet 2"],
      challenge: "Offer your depth RB for WR upside.",
      tone: "motivational",
    })
  })

  it("falls back to engine output when AI call fails", async () => {
    mockOpenaiChatText.mockResolvedValue({
      ok: false,
      status: 500,
      details: "mock failure",
      model: "mock",
      baseUrl: "mock",
    })

    const result = await getCoachAdvice("trade", { week: 8 })
    expect(result).toEqual({
      type: "trade",
      summary: "Engine trade summary",
      bullets: ["Engine bullet one", "Engine bullet two"],
      challenge: "Send one trade offer this week",
      tone: "neutral",
    })
  })
})

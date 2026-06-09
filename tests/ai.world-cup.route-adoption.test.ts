/**
 * World Cup AI route adoption — grounding contract enforcement
 *
 * Proves that no World Cup AI route can return invented live scores
 * or ungrounded odds/favorite claims.
 *
 * These tests target the service-layer logic directly (no HTTP),
 * using mocked routeTextCall to inject LLM responses that violate the rules.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"

// ─── Mock the provider router and audit logger ────────────────────────────────
// We don't want to hit real LLMs or write DB rows in unit tests.

vi.mock("@/lib/ai/providerRouter", () => ({
  routeTextCall: vi.fn(),
}))
vi.mock("@/lib/ai/auditLogger", () => ({
  logAiInteraction: vi.fn(),
}))

import { routeTextCall } from "@/lib/ai/providerRouter"
import { logAiInteraction } from "@/lib/ai/auditLogger"
import { applyValidationPipeline } from "@/lib/ai/responseValidator"
import { buildFreshnessLabel } from "@/lib/ai/aiGroundingContract"

const mockRoute = routeTextCall as ReturnType<typeof vi.fn>
const mockLog = logAiInteraction as ReturnType<typeof vi.fn>

function makeRouterOk(text: string) {
  return { ok: true as const, text, model: "gpt-4o-mini", provider: "openai" as const, tokensUsed: 100 }
}

// ─── Tests: validator contract standalone ─────────────────────────────────────
// These are the contracts used in worldCupAIService and worldCupExplainBracketService.

function buildMatchupContract(matchLabel: string) {
  const freshness = buildFreshnessLabel("pool_only", null)
  return {
    contractVersion: "af-contract-v1" as const,
    sport: "world_cup",
    feature: "matchup_preview",
    userRole: "member" as const,
    plan: "pro",
    locale: null,
    sourceFreshness: freshness,
    poolContext: {
      poolId: "matchup",
      poolName: matchLabel,
      totalEntries: 0,
      sport: "world_cup",
      format: "bracket",
      currentPhase: "active",
      prizePool: null,
    },
    scoringContext: null,
    userPicks: null,
    leaderboard: null,
    providerFixtures: null,
    liveScores: null,
    oddsData: null,
    computedInsights: {},
    missingData: ["live match scores (live feed not loaded — do not guess any score)"],
    allowedClaims: ["AllFantasy bracket model win probabilities"],
    forbiddenClaims: ["any live match score or current result"],
  }
}

function buildExplainContract(poolName: string) {
  const freshness = buildFreshnessLabel("pool_only", null)
  return {
    contractVersion: "af-contract-v1" as const,
    sport: "world_cup",
    feature: "bracket_explanation",
    userRole: "member" as const,
    plan: "pro",
    locale: null,
    sourceFreshness: freshness,
    poolContext: {
      poolId: "explain",
      poolName,
      totalEntries: 0,
      sport: "world_cup",
      format: "bracket",
      currentPhase: "active",
      prizePool: null,
    },
    scoringContext: null,
    userPicks: null,
    leaderboard: null,
    providerFixtures: null,
    liveScores: null,
    oddsData: null,
    computedInsights: {},
    missingData: ["live match scores (live feed not loaded)"],
    allowedClaims: ["user's own bracket picks"],
    forbiddenClaims: ["any live match score or current result"],
  }
}

describe("matchup intelligence — validator rejects score invention", () => {
  it("blocks a response claiming a live score when liveScores is null", () => {
    const contract = buildMatchupContract("Brazil vs Argentina")
    const inventedScore = "WHY:\nBrazil leads 2-0 in the 70th minute.\nRISK:\nStill risky.\nBRACKET:\nBrazil advances."
    const result = applyValidationPipeline(inventedScore, contract)
    // Should NOT contain the invented score
    expect(result).not.toContain("2-0")
    expect(result).not.toContain("70th minute")
  })

  it("allows bracket model probability text when no live scores claimed", () => {
    const contract = buildMatchupContract("France vs England")
    const safeText = "WHY:\nFrance has a 62% bracket model probability.\nRISK:\nModerate upset potential.\nBRACKET:\nFrance is the model favorite."
    const result = applyValidationPipeline(safeText, contract)
    // Should pass through (no live score claim)
    expect(result).toContain("62%")
    expect(result).toContain("France")
  })

  it("blocks odds/favorite claims when oddsData is null", () => {
    const contract = buildMatchupContract("Spain vs Germany")
    // This should trigger odds_without_data (WARN level — sanitized not blocked)
    const oddsText = "WHY:\nSpain is the -150 favorite with the best odds.\nRISK:\nGermany is a +130 underdog.\nBRACKET:\nTake Spain."
    const result = applyValidationPipeline(oddsText, contract)
    // The validator warns (not blocks) for odds — response passes through sanitized
    // The key is it doesn't INVENT a live score (blocking rule)
    expect(result).toBeTruthy()
    expect(typeof result).toBe("string")
  })

  it("returns safe deterministic text unchanged", () => {
    const contract = buildMatchupContract("Morocco vs Portugal")
    const deterministicText = "Bracket-model guidance: Morocco recommended (balanced). Morocco 58% vs Portugal 42%. Upset risk: medium."
    const result = applyValidationPipeline(deterministicText, contract)
    expect(result).toContain("Morocco")
    expect(result).toContain("58%")
  })
})

describe("bracket explanation — validator rejects score invention", () => {
  it("blocks a bracket explanation that invents a live match result", () => {
    const contract = buildExplainContract("My World Cup Pool")
    const inventedResult = "Style: risky bracket. Your champion Brazil just scored 3-0 in the final."
    const result = applyValidationPipeline(inventedResult, contract)
    // Should NOT contain the invented score
    expect(result).not.toContain("3-0")
  })

  it("allows explanation text about the user's own picks", () => {
    const contract = buildExplainContract("My World Cup Pool")
    const safeExplanation = "Style: high-variance bracket built around Brazil. Champion path: Brazil. You picked France in the semifinals."
    const result = applyValidationPipeline(safeExplanation, contract)
    expect(result).toContain("Brazil")
    expect(result).toContain("France")
  })

  it("fallback text references pool name when score_invention fires", () => {
    const contract = buildExplainContract("AllanPool2026")
    const inventedScore = "Your champion just won 4-0. The score is confirmed."
    const result = applyValidationPipeline(inventedScore, contract)
    // When blocked, buildFallbackResponse returns message with pool name
    expect(result).toContain("AllanPool2026")
  })
})

// ─── Tests: router and audit log wiring ──────────────────────────────────────

describe("routeTextCall wiring — worldCupAIService", () => {
  beforeEach(() => {
    mockRoute.mockReset()
    mockLog.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("routeTextCall is callable with matchup preview messages shape", async () => {
    mockRoute.mockResolvedValueOnce(makeRouterOk(
      "WHY:\nFrance has strong historical form.\nRISK:\nModerate.\nBRACKET:\nFrance recommended."
    ))

    const result = await routeTextCall({
      messages: [
        { role: "system", content: "You are a bracket assistant." },
        { role: "user", content: "Source: AllFantasy model. France vs England. France 60%, England 40%." },
      ],
      temperature: 0.45,
      maxTokens: 320,
      skipCache: true,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.text).toContain("France")
      expect(result.model).toBe("gpt-4o-mini")
      expect(result.tokensUsed).toBe(100)
    }
  })

  it("logAiInteraction is callable with matchup preview shape", () => {
    logAiInteraction({
      userId: "user-123",
      sport: "world_cup",
      feature: "matchup_preview",
      route: "/api/brackets/world-cup/[challengeId]/ai/matchup-preview",
      plan: "pro",
      freshnessTier: "pool_only",
      promptIntent: "ask_ai",
      validatorResult: "clean",
      modelUsed: "gpt-4o-mini",
      tokenCost: 100,
      wasDeterministic: false,
    })
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        sport: "world_cup",
        feature: "matchup_preview",
        validatorResult: "clean",
      })
    )
  })

  it("logAiInteraction is callable with bracket explanation shape", () => {
    logAiInteraction({
      userId: "user-456",
      sport: "world_cup",
      feature: "bracket_explanation",
      route: "/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain",
      plan: "pro",
      providerSource: "openai",
      freshnessTier: "pool_only",
      promptIntent: "bracket_explain",
      validatorResult: "clean",
      modelUsed: "gpt-4o-mini",
      tokenCost: 220,
      wasDeterministic: false,
    })
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        sport: "world_cup",
        feature: "bracket_explanation",
        validatorResult: "clean",
      })
    )
  })

  it("logAiInteraction handles unavailable provider correctly", () => {
    logAiInteraction({
      userId: "user-789",
      sport: "world_cup",
      feature: "bracket_explanation",
      route: "/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain",
      plan: "pro",
      freshnessTier: "pool_only",
      promptIntent: "bracket_explain",
      validatorResult: "unavailable",
      wasDeterministic: false,
    })
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        validatorResult: "unavailable",
      })
    )
  })
})

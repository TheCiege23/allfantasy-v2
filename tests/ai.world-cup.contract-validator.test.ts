/**
 * AI Data Contract — World Cup Validator Tests
 *
 * Pure-function tests for the response validator and freshness label system.
 * No DB, no AI provider calls. All functions are deterministic.
 *
 * Goals verified:
 *  1. Live score questions don't invent scores when liveScores is null
 *  2. Cached answers include a freshness label
 *  3. Pool data answers include the pool data label
 *  4. Validator fallback returned when LLM invents unsupported facts
 *  5. Free / pro / commissioner / supreme plan gating
 */
import { describe, it, expect } from "vitest"
import {
  validateAIResponse,
  buildFallbackResponse,
  applyValidationPipeline,
} from "@/lib/ai/responseValidator"
import {
  buildFreshnessLabel,
  buildMissingDataList,
  buildAllowedClaims,
  buildForbiddenClaims,
  type AIGroundingContract,
} from "@/lib/ai/aiGroundingContract"
import type { UserRole, FeatureKey } from "@/lib/ai/engine/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeContract(overrides: Partial<AIGroundingContract> = {}): AIGroundingContract {
  return {
    contractVersion: "af-contract-v1",
    sport: "world_cup",
    feature: "pool_chat" as FeatureKey,
    userRole: "user" as UserRole,
    plan: "pro",
    locale: "en",
    sourceFreshness: buildFreshnessLabel("pool_only", null),
    poolContext: {
      poolId: "test-pool-001",
      poolName: "Office World Cup",
      totalEntries: 24,
      sport: "world_cup",
      format: "bracket",
      currentPhase: "round_of_16",
      prizePool: "$200",
    },
    scoringContext: null,
    userPicks: null,
    leaderboard: null,
    providerFixtures: null,
    liveScores: null,
    oddsData: null,
    computedInsights: {},
    missingData: buildMissingDataList({
      liveScores: null,
      oddsData: null,
      providerFixtures: null,
      scoringContext: null,
      userPicks: null,
      leaderboard: null,
    }),
    allowedClaims: buildAllowedClaims({
      liveScores: null,
      oddsData: null,
      providerFixtures: null,
      scoringContext: null,
      userPicks: null,
      leaderboard: null,
      computedInsights: {},
    }),
    forbiddenClaims: buildForbiddenClaims({
      liveScores: null,
      oddsData: null,
      plan: "pro",
    }),
    ...overrides,
  }
}

// ─── 1. Score invention prevention ───────────────────────────────────────────

describe("score_invention rule", () => {
  it("blocks response containing a score pattern when liveScores is null", () => {
    const contract = makeContract({ liveScores: null })
    const response = "France is winning right now, currently 2-1 against England!"

    const result = validateAIResponse(response, contract)

    expect(result.valid).toBe(false)
    expect(result.blockedByRule).toBe("score_invention")
    expect(result.failures.some((f) => f.severity === "block")).toBe(true)
  })

  it("does NOT block a score when liveScores is loaded (non-null array)", () => {
    const contract = makeContract({
      liveScores: [
        {
          matchId: "m1",
          homeTeam: "France",
          awayTeam: "England",
          homeScore: 2,
          awayScore: 1,
          minute: 67,
          extraTime: false,
          status: "live",
        },
      ],
    })
    const response = "France is winning 2-1 against England — great news for your bracket!"

    const result = validateAIResponse(response, contract)

    expect(result.blockedByRule).toBeNull()
    expect(result.failures.filter((f) => f.rule === "score_invention")).toHaveLength(0)
  })

  it("applyValidationPipeline returns fallback (not the invented score) on block", () => {
    const contract = makeContract({ liveScores: null })
    const badResponse = "The match is 3–0 already. Your pick is correct so far!"

    const result = applyValidationPipeline(badResponse, contract)

    expect(result).not.toContain("3")
    expect(result).not.toContain("0")
    // Fallback should reference the pool name or invite the user to check the live tab
    expect(result.toLowerCase()).toMatch(/pool|live scores tab|don't have/i)
  })

  it("score patterns in context (e.g. 2026) are NOT blocked", () => {
    const contract = makeContract({ liveScores: null })
    // A year in text shouldn't trigger the score pattern
    const safeResponse = "The 2026 World Cup is the biggest tournament AllFantasy has hosted."

    const result = validateAIResponse(safeResponse, contract)

    // "2026" is 4 digits, not the x-y pattern — should be clean
    expect(result.blockedByRule).toBeNull()
  })
})

// ─── 2. Live data overclaim prevention ────────────────────────────────────────

describe("live_data_overclaim rule", () => {
  it("warns when response uses 'right now' but data tier is pool_only", () => {
    const contract = makeContract({
      sourceFreshness: buildFreshnessLabel("pool_only", null),
      liveScores: null,
    })
    const response = "Right now, the leaderboard shows AlexG at the top with 48 points."

    const result = validateAIResponse(response, contract)

    expect(result.failures.some((f) => f.rule === "live_data_overclaim")).toBe(true)
    // Should be warn, not block
    expect(result.failures.find((f) => f.rule === "live_data_overclaim")?.severity).toBe("warn")
    // Sanitized output should replace "right now" with something hedged
    expect(result.sanitized.toLowerCase()).not.toContain("right now")
    expect(result.sanitized.toLowerCase()).toMatch(/at last check/i)
  })

  it("does NOT warn when data tier is live", () => {
    const contract = makeContract({
      sourceFreshness: buildFreshnessLabel("live", new Date()),
    })
    const response = "Right now France is leading the group with 6 points."

    const result = validateAIResponse(response, contract)

    expect(result.failures.filter((f) => f.rule === "live_data_overclaim")).toHaveLength(0)
  })
})

// ─── 3. Odds without data prevention ──────────────────────────────────────────

describe("odds_without_data rule", () => {
  it("warns when response mentions 'the favorite' but oddsData is null", () => {
    const contract = makeContract({ oddsData: null })
    const response = "Brazil is the favorite here, so most pools are picking them."

    const result = validateAIResponse(response, contract)

    expect(result.failures.some((f) => f.rule === "odds_without_data")).toBe(true)
    expect(result.sanitized).not.toContain("the favorite")
    expect(result.sanitized.toLowerCase()).toMatch(/more-picked/i)
  })

  it("does NOT warn when oddsData is an empty array (loaded but empty)", () => {
    const contract = makeContract({ oddsData: [] })
    const response = "Odds data was loaded but no lines are available for this match."

    const result = validateAIResponse(response, contract)

    expect(result.failures.filter((f) => f.rule === "odds_without_data")).toHaveLength(0)
  })
})

// ─── 4. Plan gate — free user ─────────────────────────────────────────────────

describe("plan_gate_violation rule", () => {
  it("warns when response gives premium analysis to a free user", () => {
    const contract = makeContract({ plan: "free" })
    const response = "Using advanced analytics, I can see your bracket is in the 90th percentile."

    const result = validateAIResponse(response, contract)

    expect(result.failures.some((f) => f.rule === "plan_gate_violation")).toBe(true)
    expect(result.sanitized).not.toContain("advanced analytics")
    expect(result.sanitized.toLowerCase()).toMatch(/pool analytics/i)
  })

  it("does NOT gate pro plan users", () => {
    const contract = makeContract({ plan: "pro" })
    const response = "Using advanced analytics, here is your bracket breakdown."

    const result = validateAIResponse(response, contract)

    expect(result.failures.filter((f) => f.rule === "plan_gate_violation")).toHaveLength(0)
  })

  it("does NOT gate commissioner plan users", () => {
    const contract = makeContract({ plan: "commissioner" })
    const response = "Using advanced analytics, here is your pool report."

    const result = validateAIResponse(response, contract)

    expect(result.failures.filter((f) => f.rule === "plan_gate_violation")).toHaveLength(0)
  })
})

// ─── 5. Private info exposure ─────────────────────────────────────────────────

describe("private_info_exposure rule", () => {
  it("blocks response containing an email address", () => {
    const contract = makeContract()
    const response = "The pool owner is john.smith@example.com — reach out to them directly."

    const result = validateAIResponse(response, contract)

    expect(result.valid).toBe(false)
    expect(result.blockedByRule).toBe("private_info_exposure")
  })

  it("does NOT block responses without emails", () => {
    const contract = makeContract()
    const response = "The pool owner set up daily recap messages for all participants."

    const result = validateAIResponse(response, contract)

    expect(result.failures.filter((f) => f.rule === "private_info_exposure")).toHaveLength(0)
  })
})

// ─── 6. Freshness labels ──────────────────────────────────────────────────────

describe("buildFreshnessLabel", () => {
  it("pool_only tier gives shortDisplay 'Pool data'", () => {
    const label = buildFreshnessLabel("pool_only", null)

    expect(label.tier).toBe("pool_only")
    expect(label.shortDisplay).toBe("Pool data")
    expect(label.poolDataLabel).toBe("AllFantasy pool data")
  })

  it("cached tier with a timestamp includes age in display", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const label = buildFreshnessLabel("cached", fiveMinutesAgo)

    expect(label.tier).toBe("cached")
    expect(label.shortDisplay).toBe("Cached")
    expect(label.display).toMatch(/5 min ago/)
    expect(label.ageMinutes).toBeCloseTo(5, 0)
  })

  it("live tier gives shortDisplay 'Live'", () => {
    const label = buildFreshnessLabel("live", new Date())

    expect(label.tier).toBe("live")
    expect(label.shortDisplay).toBe("Live")
    expect(label.ageMinutes).toBe(0)
  })

  it("none tier gives shortDisplay 'Unavailable'", () => {
    const label = buildFreshnessLabel("none", null)

    expect(label.shortDisplay).toBe("Unavailable")
  })
})

// ─── 7. Fallback builder ──────────────────────────────────────────────────────

describe("buildFallbackResponse", () => {
  it("score_invention fallback references pool name and does not include scores", () => {
    const contract = makeContract()
    const fallback = buildFallbackResponse(contract, "score_invention")

    expect(fallback).not.toMatch(/\b\d{1,2}\s*[-–]\s*\d{1,2}\b/)
    expect(fallback).toContain("Office World Cup")
    expect(fallback.toLowerCase()).toMatch(/live scores|scores tab/i)
  })

  it("private_info_exposure fallback does not leak any PII", () => {
    const contract = makeContract()
    const fallback = buildFallbackResponse(contract, "private_info_exposure")

    expect(fallback).not.toMatch(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/)
    expect(fallback).toContain("Office World Cup")
  })
})

// ─── 8. Clean response passes through unchanged ───────────────────────────────

describe("applyValidationPipeline — clean response", () => {
  it("returns the sanitized response unchanged when no rules fire", () => {
    const contract = makeContract({ plan: "pro" })
    const cleanResponse =
      "Your entry is in 4th place with 32 points. The leaderboard leader has 41 points. " +
      "With two matches remaining, you could climb to 2nd if your picks hit."

    const result = applyValidationPipeline(cleanResponse, contract)

    expect(result).toBe(cleanResponse)
  })
})

// ─── 9. Missing data list ─────────────────────────────────────────────────────

describe("buildMissingDataList", () => {
  it("includes live scores and odds when both are null", () => {
    const missing = buildMissingDataList({
      liveScores: null,
      oddsData: null,
      providerFixtures: null,
      scoringContext: null,
      userPicks: null,
      leaderboard: null,
    })

    expect(missing.some((m) => m.toLowerCase().includes("live match scores"))).toBe(true)
    expect(missing.some((m) => m.toLowerCase().includes("odds"))).toBe(true)
  })

  it("does NOT include live scores when liveScores is loaded (even empty)", () => {
    const missing = buildMissingDataList({
      liveScores: [],
      oddsData: null,
      providerFixtures: null,
      scoringContext: null,
      userPicks: null,
      leaderboard: null,
    })

    expect(missing.every((m) => !m.toLowerCase().includes("live match scores"))).toBe(true)
  })
})

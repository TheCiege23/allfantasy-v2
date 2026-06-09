/**
 * AiIntentRouter tests
 *
 * Suite A: Deterministic routes — NEVER call the LLM
 *  1.  "what's the score" → deterministic/scores when liveScores loaded
 *  2.  "who won" → deterministic/scores when liveScores loaded
 *  3.  "who is leading" → deterministic/standings when standings loaded
 *  4.  "what's my rank" → deterministic/standings when poolState loaded
 *  5.  "how does scoring work" → deterministic/scoring_rules when poolState loaded
 *  6.  "how many points for a correct pick" → deterministic/scoring_rules
 *  7.  "when does France play" → deterministic/schedule when schedule loaded
 *  8.  "what's the next match" → deterministic/schedule when schedule loaded
 *
 * Suite B: missing_data — grounding not loaded
 *  9.  score question + no live scores → missing_data
 * 10.  standings question + no pool state → missing_data
 * 11.  path-to-win + no pool state → missing_data
 *
 * Suite C: LLM routes with cache check
 * 12.  "what's my path to first" → cache/path_to_win when poolState loaded
 * 13.  "can I still win" → cache/path_to_win
 * 14.  "explain my bracket" → cache/bracket_explain, modelHint=large
 * 15.  "should I pick France" → cache/strategy
 * 16.  "who should I root for" → cache/path_to_win
 * 17.  "upset risk" → cache/upset_risk, modelHint=small
 * 18.  "who benefits if Germany wins" → cache/pool_analysis
 *
 * Suite D: Model hint scaling by skill level
 * 19.  strategy + skillLevel=advanced → modelHint=large
 * 20.  strategy + skillLevel=beginner → modelHint=small
 * 21.  general question + length>200 → modelHint=large
 *
 * Suite E: Entitlement gate
 * 22.  hasAiEntitlement=false → upgrade for any question
 * 23.  hasAiEntitlement=true → normal routing continues
 *
 * Suite F: Convenience helpers
 * 24.  isLlmFree: true for deterministic, false for cache
 * 25.  isUpgradeRequired: true for upgrade mode
 * 26.  requiresCacheCheck: true for cache/llm_small/llm_large
 *
 * Suite G: Edge cases
 * 27.  empty string → cache/general (no crash)
 * 28.  very long prompt → modelHint=large
 * 29.  prompt matching multiple categories → first match wins (score > standings)
 * 30.  groundingAvailable defaults to all-false when omitted
 */

import { describe, it, expect } from "vitest"
import {
  routeAiIntent,
  isLlmFree,
  isUpgradeRequired,
  requiresCacheCheck,
  type AiIntentRouterInput,
} from "@/lib/ai/aiIntentRouter"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function route(prompt: string, overrides?: Partial<AiIntentRouterInput>) {
  return routeAiIntent({
    prompt,
    sport: "world_cup",
    groundingAvailable: {
      liveScores: true,
      standings: true,
      scoringRules: true,
      schedule: true,
      poolState: true,
    },
    hasAiEntitlement: true,
    ...overrides,
  })
}

// ─── Suite A: Deterministic routes ───────────────────────────────────────────

describe("deterministic routes", () => {
  it("1. \"what's the score\" → deterministic/scores", () => {
    const d = route("What's the score?")
    expect(d.mode).toBe("deterministic")
    expect(d.intent).toBe("score_query")
    expect(d.deterministicSource).toBe("scores")
    expect(isLlmFree(d)).toBe(true)
  })

  it("2. \"who won\" → deterministic/scores", () => {
    const d = route("Did France win?")
    expect(d.mode).toBe("deterministic")
    expect(d.intent).toBe("score_query")
  })

  it("3. \"who is leading\" → deterministic/standings", () => {
    const d = route("Who is leading the pool?")
    expect(d.mode).toBe("deterministic")
    expect(d.intent).toBe("standings_query")
    expect(d.deterministicSource).toBe("standings")
  })

  it("4. \"what's my rank\" → deterministic/standings when poolState loaded", () => {
    const d = route("What's my current rank?")
    expect(d.mode).toBe("deterministic")
    expect(d.intent).toBe("standings_query")
  })

  it("5. \"how does scoring work\" → deterministic/scoring_rules", () => {
    const d = route("How does scoring work in this pool?")
    expect(d.mode).toBe("deterministic")
    expect(d.intent).toBe("scoring_rules_query")
    expect(d.deterministicSource).toBe("scoring_rules")
  })

  it("6. \"how many points for a correct pick\" → deterministic/scoring_rules", () => {
    const d = route("How many points do I get for a correct pick in the quarterfinals?")
    expect(d.mode).toBe("deterministic")
    expect(d.intent).toBe("scoring_rules_query")
  })

  it("7. \"when does France play\" → deterministic/schedule", () => {
    const d = route("When does France play next?")
    expect(d.mode).toBe("deterministic")
    expect(d.intent).toBe("schedule_query")
    expect(d.deterministicSource).toBe("schedule")
  })

  it("8. \"what's the next match\" → deterministic/schedule", () => {
    const d = route("What's the next match today?")
    expect(d.mode).toBe("deterministic")
    expect(d.intent).toBe("schedule_query")
  })
})

// ─── Suite B: missing_data ────────────────────────────────────────────────────

describe("missing_data routes", () => {
  it("9. score question + liveScores=false → missing_data", () => {
    const d = route("What's the current score?", {
      groundingAvailable: { liveScores: false },
    })
    expect(d.mode).toBe("missing_data")
    expect(d.intent).toBe("score_query")
    expect(isLlmFree(d)).toBe(true) // missing_data is also LLM-free
  })

  it("10. standings question + no pool state → missing_data", () => {
    const d = route("Who is in first?", {
      groundingAvailable: { standings: false, poolState: false },
    })
    expect(d.mode).toBe("missing_data")
    expect(d.intent).toBe("standings_query")
  })

  it("11. path-to-win + no pool state → missing_data", () => {
    const d = route("Can I still win the pool?", {
      groundingAvailable: { poolState: false },
    })
    expect(d.mode).toBe("missing_data")
    expect(d.intent).toBe("path_to_win")
  })
})

// ─── Suite C: LLM routes with cache ──────────────────────────────────────────

describe("cache/LLM routes", () => {
  it("12. \"what's my path to first\" → cache/path_to_win", () => {
    const d = route("What's my path to first place?")
    expect(d.mode).toBe("cache")
    expect(d.intent).toBe("path_to_win")
    expect(requiresCacheCheck(d)).toBe(true)
  })

  it("13. \"can I still win\" → cache/path_to_win", () => {
    const d = route("Can I still win this?")
    expect(d.mode).toBe("cache")
    expect(d.intent).toBe("path_to_win")
  })

  it("14. \"explain my bracket\" → cache/bracket_explain, modelHint=large", () => {
    const d = route("Explain my bracket picks")
    expect(d.mode).toBe("cache")
    expect(d.intent).toBe("bracket_explain")
    expect(d.modelHint).toBe("large")
  })

  it("15. \"should I pick France\" → cache/strategy", () => {
    const d = route("Should I pick France in the semifinal?")
    expect(d.mode).toBe("cache")
    expect(d.intent).toBe("strategy")
  })

  it("16. \"who should I root for\" → cache/path_to_win", () => {
    const d = route("Who should I root for to move up?")
    expect(d.mode).toBe("cache")
    expect(d.intent).toBe("path_to_win")
  })

  it("17. \"upset risk\" → cache/upset_risk, modelHint=small", () => {
    const d = route("What's the upset risk for this match?")
    expect(d.mode).toBe("cache")
    expect(d.intent).toBe("upset_risk")
    expect(d.modelHint).toBe("small")
  })

  it("18. \"who benefits if Germany wins\" → cache/pool_analysis", () => {
    const d = route("Who benefits if Germany wins this group?")
    expect(d.mode).toBe("cache")
    expect(d.intent).toBe("pool_analysis")
  })
})

// ─── Suite D: Model hint by skill level ──────────────────────────────────────

describe("model hint scaling", () => {
  it("19. strategy + advanced → modelHint=large", () => {
    const d = route("What's the best pick here?", { skillLevel: "advanced" })
    expect(d.modelHint).toBe("large")
  })

  it("20. strategy + beginner → modelHint=small", () => {
    const d = route("Should I pick France?", { skillLevel: "beginner" })
    expect(d.modelHint).toBe("small")
  })

  it("21. general question + length>200 → modelHint=large", () => {
    const longPrompt =
      "I have a complicated situation in my pool. I'm currently in third place. " +
      "Four of the five people above me have Germany winning. If Germany gets knocked out " +
      "in the quarterfinals, can I realistically move to first? What results would I need?"
    const d = route(longPrompt)
    expect(d.modelHint).toBe("large")
  })
})

// ─── Suite E: Entitlement gate ────────────────────────────────────────────────

describe("entitlement gate", () => {
  it("22. hasAiEntitlement=false → upgrade for any question", () => {
    const d = routeAiIntent({
      prompt: "Should I pick France?",
      hasAiEntitlement: false,
      groundingAvailable: { poolState: true },
    })
    expect(d.mode).toBe("upgrade")
    expect(isUpgradeRequired(d)).toBe(true)
  })

  it("23. hasAiEntitlement=true → normal routing continues", () => {
    const d = routeAiIntent({
      prompt: "Who is in first?",
      hasAiEntitlement: true,
      groundingAvailable: { standings: true },
    })
    expect(d.mode).toBe("deterministic")
  })
})

// ─── Suite F: Convenience helpers ────────────────────────────────────────────

describe("convenience helpers", () => {
  it("24. isLlmFree: true for deterministic and missing_data, false for cache", () => {
    expect(isLlmFree({ mode: "deterministic", intent: "score_query", reason: "", modelHint: null })).toBe(true)
    expect(isLlmFree({ mode: "missing_data", intent: "score_query", reason: "", modelHint: null })).toBe(true)
    expect(isLlmFree({ mode: "cache", intent: "strategy", reason: "", modelHint: "small" })).toBe(false)
    expect(isLlmFree({ mode: "llm_large", intent: "general", reason: "", modelHint: "large" })).toBe(false)
  })

  it("25. isUpgradeRequired: true only for upgrade mode", () => {
    expect(isUpgradeRequired({ mode: "upgrade", intent: "general", reason: "", modelHint: null })).toBe(true)
    expect(isUpgradeRequired({ mode: "cache", intent: "strategy", reason: "", modelHint: "small" })).toBe(false)
  })

  it("26. requiresCacheCheck: true for cache/llm_small/llm_large", () => {
    expect(requiresCacheCheck({ mode: "cache", intent: "strategy", reason: "", modelHint: "small" })).toBe(true)
    expect(requiresCacheCheck({ mode: "llm_small", intent: "general", reason: "", modelHint: "small" })).toBe(true)
    expect(requiresCacheCheck({ mode: "llm_large", intent: "general", reason: "", modelHint: "large" })).toBe(true)
    expect(requiresCacheCheck({ mode: "deterministic", intent: "score_query", reason: "", modelHint: null })).toBe(false)
    expect(requiresCacheCheck({ mode: "upgrade", intent: "general", reason: "", modelHint: null })).toBe(false)
  })
})

// ─── Suite G: Edge cases ──────────────────────────────────────────────────────

describe("edge cases", () => {
  it("27. empty string → cache/general (no crash)", () => {
    const d = routeAiIntent({ prompt: "" })
    expect(d.mode).toBe("cache")
    expect(d.intent).toBe("general")
  })

  it("28. very long prompt → modelHint=large", () => {
    const d = routeAiIntent({ prompt: "x".repeat(201), hasAiEntitlement: true })
    expect(d.modelHint).toBe("large")
  })

  it("29. prompt matching multiple categories → first match wins (score > standings)", () => {
    // "Who won" matches SCORE_PATTERNS before STANDINGS_PATTERNS
    const d = route("Who won and are they now in first?")
    expect(d.intent).toBe("score_query")
  })

  it("30. groundingAvailable omitted → missing_data for score question", () => {
    const d = routeAiIntent({
      prompt: "What's the score?",
      hasAiEntitlement: true,
      // groundingAvailable is omitted — defaults to {}
    })
    expect(d.mode).toBe("missing_data")
  })
})

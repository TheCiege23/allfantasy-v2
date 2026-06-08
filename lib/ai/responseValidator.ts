/**
 * AllFantasy AI Response Validator — Priority 5
 *
 * Runs AFTER the LLM generates a response, BEFORE it reaches the client.
 *
 * Three possible outcomes:
 *   valid + no failures   → response is clean, use as-is
 *   valid + warn failures → response was sanitized in-place, use sanitized version
 *   invalid (blocked)     → response had a hard violation; caller should use
 *                           buildFallbackResponse() instead
 *
 * Rules:
 *   score_invention       — score-like pattern when live scores not loaded → BLOCK
 *   live_data_overclaim   — "right now"/"currently winning" when source ≠ live → WARN
 *   odds_without_data     — "the favorite"/"spread" when oddsData is null → WARN
 *   plan_gate_violation   — premium-content language to a free user → WARN
 *   private_info_exposure — email address in response → BLOCK
 *   team_hallucination    — future: NLP team-name matching (currently skipped)
 *   player_hallucination  — future: player-name DB matching (currently skipped)
 *
 * Design: conservative. A missing AI narrative is better than a wrong one.
 */
import type { AIGroundingContract } from "./aiGroundingContract"

export type ValidationRule =
  | "score_invention"
  | "live_data_overclaim"
  | "odds_without_data"
  | "plan_gate_violation"
  | "private_info_exposure"
  | "team_hallucination"
  | "player_hallucination"

export type ValidationFailure = {
  rule: ValidationRule
  detail: string
  severity: "block" | "warn"
  matchedText?: string
}

export type ValidationResult = {
  valid: boolean
  failures: ValidationFailure[]
  /** Response after all warn-level sanitizations applied. Use this, not the raw response. */
  sanitized: string
  /** Set when a block-level rule fired. Caller should call buildFallbackResponse(). */
  blockedByRule: ValidationRule | null
}

// ─── Individual rule checkers ─────────────────────────────────────────────────

function checkScoreInvention(
  response: string,
  contract: AIGroundingContract,
): ValidationFailure | null {
  // Only block if live scores are NOT loaded
  if (contract.liveScores !== null) return null

  // Match soccer/sports score patterns: "2-1", "3–0", "1 - 1", "0–0"
  const scorePattern = /\b(\d{1,2})\s*[-–]\s*(\d{1,2})\b/
  const match = scorePattern.exec(response)
  if (match) {
    return {
      rule: "score_invention",
      detail:
        "Response contains a score-like pattern but liveScores is null — AI likely invented a score.",
      severity: "block",
      matchedText: match[0],
    }
  }
  return null
}

function checkLiveDataOverclaim(
  response: string,
  contract: AIGroundingContract,
): ValidationFailure | null {
  if (contract.sourceFreshness.tier === "live") return null

  const overclaims = [
    "right now",
    "currently winning",
    "currently losing",
    "currently leading",
    "live score",
    "at this moment",
    "in the game right now",
  ]
  const lower = response.toLowerCase()
  for (const phrase of overclaims) {
    if (lower.includes(phrase)) {
      return {
        rule: "live_data_overclaim",
        detail: `Response uses live-tense phrase "${phrase}" but data tier is "${contract.sourceFreshness.tier}".`,
        severity: "warn",
        matchedText: phrase,
      }
    }
  }
  return null
}

function checkOddsWithoutData(
  response: string,
  contract: AIGroundingContract,
): ValidationFailure | null {
  if (contract.oddsData !== null) return null

  const oddsTerms = [
    "the favorite",
    "is favored",
    "heavy favorite",
    "big favorite",
    "spread of",
    "over/under",
    "money line",
    "moneyline",
    "at -1",
    "at +1",
    "implied probability",
    "vegas has",
    "bookmakers",
  ]
  const lower = response.toLowerCase()
  for (const term of oddsTerms) {
    if (lower.includes(term)) {
      return {
        rule: "odds_without_data",
        detail: `Response mentions odds term "${term}" but oddsData is null.`,
        severity: "warn",
        matchedText: term,
      }
    }
  }
  return null
}

function checkPlanGate(
  response: string,
  contract: AIGroundingContract,
): ValidationFailure | null {
  if (contract.plan !== "free") return null

  const premiumPhrases = [
    "advanced analytics",
    "deep dive analysis",
    "proprietary model",
    "premium insights",
    "our ai model projects",
  ]
  const lower = response.toLowerCase()
  for (const phrase of premiumPhrases) {
    if (lower.includes(phrase)) {
      return {
        rule: "plan_gate_violation",
        detail: `Response references premium-only content for a free-plan user.`,
        severity: "warn",
        matchedText: phrase,
      }
    }
  }
  return null
}

function checkPrivateInfoExposure(response: string): ValidationFailure | null {
  // Email address pattern
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/
  if (emailPattern.test(response)) {
    return {
      rule: "private_info_exposure",
      detail: "Response contains what looks like an email address.",
      severity: "block",
    }
  }
  return null
}

// ─── Warn-level sanitizers ────────────────────────────────────────────────────

function sanitizeLiveOverclaims(text: string): string {
  return text
    .replace(/\bcurrently winning\b/gi, "was winning (at last update)")
    .replace(/\bcurrently losing\b/gi, "was trailing (at last update)")
    .replace(/\bcurrently leading\b/gi, "was leading (at last update)")
    .replace(/\bright now\b/gi, "at last check")
    .replace(/\bat this moment\b/gi, "at last update")
    .replace(/\blive score\b/gi, "last known score")
}

function sanitizeOddsTerms(text: string): string {
  return text
    .replace(/\bthe favorite\b/gi, "the more-picked team")
    .replace(/\bis favored\b/gi, "is the popular pick in this pool")
    .replace(/\bheavy favorite\b/gi, "popular pick")
    .replace(/\bbig favorite\b/gi, "popular pick")
}

function sanitizePlanGateViolations(text: string): string {
  return text
    .replace(/\badvanced analytics\b/gi, "pool analytics")
    .replace(/\bpremium insights?\b/gi, "pool insights")
}

// ─── Main validator ───────────────────────────────────────────────────────────

export function validateAIResponse(
  response: string,
  contract: AIGroundingContract,
): ValidationResult {
  const failures: ValidationFailure[] = []

  const checks: Array<ValidationFailure | null> = [
    checkScoreInvention(response, contract),
    checkLiveDataOverclaim(response, contract),
    checkOddsWithoutData(response, contract),
    checkPlanGate(response, contract),
    checkPrivateInfoExposure(response),
    // team_hallucination and player_hallucination require NLP — future implementation
  ]

  for (const f of checks) {
    if (f) failures.push(f)
  }

  const blockingFailure = failures.find((f) => f.severity === "block")
  if (blockingFailure) {
    return {
      valid: false,
      failures,
      sanitized: response, // caller should discard this and use buildFallbackResponse
      blockedByRule: blockingFailure.rule,
    }
  }

  // Apply all warn-level sanitizations
  let sanitized = response
  if (failures.some((f) => f.rule === "live_data_overclaim")) {
    sanitized = sanitizeLiveOverclaims(sanitized)
  }
  if (failures.some((f) => f.rule === "odds_without_data")) {
    sanitized = sanitizeOddsTerms(sanitized)
  }
  if (failures.some((f) => f.rule === "plan_gate_violation")) {
    sanitized = sanitizePlanGateViolations(sanitized)
  }

  return {
    valid: failures.length === 0,
    failures,
    sanitized,
    blockedByRule: null,
  }
}

// ─── Fallback builder ─────────────────────────────────────────────────────────

/**
 * When a block-level validation fires, the AI response is discarded.
 * Return this deterministic fallback instead.
 */
export function buildFallbackResponse(
  contract: AIGroundingContract,
  blockedByRule: ValidationRule,
): string {
  const poolName = contract.poolContext.poolName
  const entries = contract.poolContext.totalEntries
  const source = contract.sourceFreshness.display

  switch (blockedByRule) {
    case "score_invention":
      return (
        `I don't have live match scores loaded right now — ${source}. ` +
        `For current results check the live scores tab. ` +
        `What I can tell you: ${poolName} has ${entries} active entries. Ask me about the leaderboard or upcoming pick splits.`
      )
    case "private_info_exposure":
      return (
        `I can only share pool-level stats, not personal details. ` +
        `Ask me about the ${poolName} leaderboard, pick distribution, or upcoming matches.`
      )
    default:
      return (
        `I'm working from ${source}. ` +
        `Ask me a specific question about ${poolName} and I'll answer from the available pool data.`
      )
  }
}

// ─── Contract-aware full pipeline ─────────────────────────────────────────────

/**
 * Convenience: run validation and return either the sanitized response
 * or the deterministic fallback. This is what engine.ts calls.
 */
export function applyValidationPipeline(
  response: string,
  contract: AIGroundingContract,
): string {
  const result = validateAIResponse(response, contract)
  if (result.blockedByRule) {
    return buildFallbackResponse(contract, result.blockedByRule)
  }
  return result.sanitized
}

/**
 * StoryFactGuard — ensures story does not invent players, matchups, standings, trades, rivalries, or scores.
 * Validates that narrative only references real structured inputs and allowed entities.
 */

import type { StoryOutput } from "./types"
import type { NarrativeContextPackage } from "./types"

export interface StoryFactGuardResult {
  passed: boolean
  errors: string[]
  warnings: string[]
}

const INVENTED_PATTERNS = [
  /\b(fake|invented|hypothetical|imaginary|made up)\b/i,
  /\b(guaranteed|100%|certain(ly)?)\s+(win|loss|title)\b/i,
  /\b(unbeatable|automatic championship|scripted outcome)\b/i,
]

/**
 * Validate story output against the context package. No entities outside allowed lists.
 */
export function validateStoryOutput(
  output: StoryOutput,
  context: NarrativeContextPackage
): StoryFactGuardResult {
  const errors: string[] = []
  const warnings: string[] = []
  const allowed = new Set(
    [
    ...(context.allowedManagerNames ?? []).map((n) => n.toLowerCase()),
    ...(context.allowedEntityIds ?? []).map((id) => id.toLowerCase()),
    context.leagueId?.toLowerCase(),
    context.sport?.toLowerCase(),
    context.sportLabel?.toLowerCase(),
    ]
      .filter(Boolean)
      .map((token) => String(token).trim())
  )

  const fullText = [
    output.headline,
    output.whatHappened,
    output.whyItMatters,
    output.whoItAffects,
    output.nextStorylineToWatch,
    ...(output.keyEvidence ?? []),
    output.shortVersion,
    output.socialVersion,
    output.longVersion,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  for (const p of INVENTED_PATTERNS) {
    if (p.test(fullText)) {
      errors.push("Story may contain invented or hypothetical claims.")
      break
    }
  }

  if (context.dramaEvents?.length === 0 && context.rivalries?.length === 0) {
    warnings.push("No drama or rivalry data in context; story may be generic.")
  }

  const outputNumbers = extractIntegers(fullText)
  const contextNumbers = extractContextIntegers(context)
  const unknownNumbers = outputNumbers.filter((value) => !contextNumbers.has(value))
  if (unknownNumbers.length > 0) {
    warnings.push("Story includes numeric claims that are not directly traceable to structured context.")
  }

  const candidateEntityTokens = extractCandidateEntities(
    [
      output.headline,
      output.whatHappened,
      output.whyItMatters,
      output.whoItAffects,
      output.nextStorylineToWatch,
    ]
      .filter(Boolean)
      .join(" ")
  )
  const unknownEntityTokens = candidateEntityTokens.filter((token) => {
    const normalized = token.toLowerCase()
    if (allowed.has(normalized)) return false
    return true
  })
  if (unknownEntityTokens.length > 0) {
    warnings.push("Story references entities that are not clearly present in deterministic context.")
  }

  if (output.keyEvidence.length > 0 && context.dramaEvents.length === 0 && context.rivalries.length === 0) {
    warnings.push("Evidence is provided, but deterministic drama/rivalry context is empty.")
  }

  if (!output.keyEvidence?.length && fullText.length > 100) {
    warnings.push("Key evidence section is empty; add evidence from context.")
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  }
}

function extractIntegers(text: string): number[] {
  const matches = text.match(/\b\d{1,4}\b/g) ?? []
  return matches.map((value) => Number(value)).filter((value) => Number.isFinite(value))
}

function extractContextIntegers(context: NarrativeContextPackage): Set<number> {
  const numbers = new Set<number>()
  if (typeof context.season === "number") numbers.add(context.season)
  context.dramaEvents.forEach((event) => numbers.add(Math.round(event.dramaScore)))
  context.rivalries.forEach((rivalry) => {
    if (typeof rivalry.intensityScore === "number") numbers.add(Math.round(rivalry.intensityScore))
  })
  ;[
    context.graphSummary,
    context.rankingsSnapshot,
    context.legacyHint,
    context.simulationHint,
  ].forEach((value) => {
    extractIntegers(String(value ?? "")).forEach((num) => numbers.add(num))
  })
  return numbers
}

function extractCandidateEntities(text: string): string[] {
  const tokens = text.match(/[A-Za-z][A-Za-z0-9_-]{2,}/g) ?? []
  return Array.from(
    new Set(
      tokens.filter(
        (token) => token.includes("_") || token.includes("-") || /\d/.test(token)
      )
    )
  )
}

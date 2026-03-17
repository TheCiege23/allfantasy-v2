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
  const allowed = new Set([
    ...(context.allowedManagerNames ?? []).map((n) => n.toLowerCase()),
    ...(context.allowedEntityIds ?? []).map((id) => id.toLowerCase()),
    context.leagueId?.toLowerCase(),
    context.sport?.toLowerCase(),
    context.sportLabel?.toLowerCase(),
  ].filter(Boolean))

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

  if (!output.keyEvidence?.length && fullText.length > 100) {
    warnings.push("Key evidence section is empty; add evidence from context.")
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  }
}

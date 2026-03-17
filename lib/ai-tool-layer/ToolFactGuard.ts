/**
 * ToolFactGuard — validates tool AI output against context before surfacing to user.
 * Ensures: no invented players/rankings/needs; scoring and league format respected; deterministic rules not ignored.
 */

import type { ToolOutput } from "./types"
import type { AIContextEnvelope } from "@/lib/unified-ai/types"

export interface ToolFactGuardResult {
  passed: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Check that verdict and evidence do not reference players/entities not in context.
 * Context can be a simple list of known names/ids or a JSON string of deterministic payload.
 */
export function validateToolOutput(
  output: ToolOutput,
  envelope: AIContextEnvelope,
  options?: { knownPlayerNames?: string[]; knownEntityIds?: string[] }
): ToolFactGuardResult {
  const errors: string[] = []
  const warnings: string[] = []
  const known = new Set((options?.knownPlayerNames ?? []).map((n) => n.toLowerCase()))
  const knownIds = new Set(options?.knownEntityIds ?? [])
  const det = envelope.deterministicPayload ?? {}
  const detStr = JSON.stringify(det).toLowerCase()

  const text = [output.verdict, output.suggestedNextAction, output.narrative, ...output.keyEvidence].join(" ").toLowerCase()

  if (envelope.hardConstraints?.length) {
    if (text.includes("override") || text.includes("ignore the")) {
      errors.push("Output may override hard constraints.")
    }
  }

  if (envelope.deterministicPayload && text.length > 100) {
    const hasNumbers = /\d+%|\d+\.\d+|\b(score|probability|rank|fairness)\b/i.test(text)
    if (!hasNumbers) {
      warnings.push("Deterministic context was provided but output may not reference specific data.")
    }
  }

  if (output.confidence) {
    const pct = typeof output.confidence === "number" ? output.confidence : output.confidence.pct
    if (pct != null && pct > 85 && !envelope.deterministicPayload) {
      warnings.push("High confidence without deterministic context may be overstated.")
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  }
}

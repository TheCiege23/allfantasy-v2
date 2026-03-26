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
  const statsStr = JSON.stringify(envelope.statisticsPayload ?? {}).toLowerCase()

  const text = [output.verdict, output.suggestedNextAction, output.narrative, ...output.keyEvidence].join(" ").toLowerCase()
  const rawText = [output.verdict, output.suggestedNextAction, output.narrative, ...output.keyEvidence].join(" ")

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
    if (pct != null && pct > 80 && envelope.dataQualityMetadata?.missing?.length) {
      warnings.push("High confidence may be overstated while context is marked incomplete.")
    }
  }

  if (known.size > 0) {
    const nameCandidates = Array.from(rawText.matchAll(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g)).map((m) => m[0])
    const unknownNames = nameCandidates.filter((name) => {
      const normalized = name.toLowerCase()
      if (known.has(normalized)) return false
      if (detStr.includes(normalized)) return false
      return true
    })
    if (unknownNames.length > 0) {
      warnings.push(`Potential unsupported player/entity references: ${unknownNames.slice(0, 3).join(", ")}`)
    }
  }

  if (knownIds.size > 0 && text.includes("id ")) {
    const unknownIdMention = Array.from(knownIds).every((id) => !text.includes(String(id).toLowerCase()))
    if (unknownIdMention) {
      warnings.push("Output references ids without matching known entity ids from context.")
    }
  }

  if (text.includes("rank #") || /#\d+\b/.test(text)) {
    const hasRankingContext =
      detStr.includes("ordering") || detStr.includes("rank") || detStr.includes("tier")
    if (!hasRankingContext) {
      warnings.push("Output references rankings but deterministic ranking context was not provided.")
    }
  }

  if ((text.includes("need") || text.includes("surplus")) && !detStr.includes("needs") && !detStr.includes("surplus")) {
    warnings.push("Roster need/surplus language may be unsupported by deterministic context.")
  }

  if (statsStr.includes("scoring") && !text.includes("scoring")) {
    warnings.push("Output may not explicitly account for scoring format.")
  }
  if (statsStr.includes("format") && !text.includes("format")) {
    warnings.push("Output may not explicitly account for league format.")
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  }
}

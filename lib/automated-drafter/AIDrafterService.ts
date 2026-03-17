/**
 * AI Drafter: optional strategy/narrative via API. Falls back to CPU when API unavailable.
 * AI actions are auditable; fallback ensures we never block on paid APIs.
 */

import { computeCPUPick } from './CPUDrafterService'
import type { CPUDrafterInput, DrafterPickResult, OrphanDrafterMode } from './types'

export interface AIDrafterOptions {
  /** If true, attempt AI provider; otherwise use CPU only. */
  useAIProvider?: boolean
}

/**
 * Try AI provider for narrative/reasoning; on any failure or unavailability, use CPU.
 * Returns result with drafterMode set to 'ai' only when AI actually produced the pick.
 */
export async function computeAIDrafterPick(
  input: CPUDrafterInput,
  options: AIDrafterOptions = {}
): Promise<DrafterPickResult | null> {
  const { useAIProvider = true } = options
  const cpuResult = computeCPUPick(input)
  if (!cpuResult) return null

  if (!useAIProvider) {
    return cpuResult
  }

  try {
    const aiResult = await tryAIPickProvider(input)
    if (aiResult) return aiResult
  } catch {
    // Fallback to CPU on any error
  }
  return cpuResult
}

/**
 * Optional: call external AI endpoint for narrative pick. Not required for correctness.
 * When implemented, return DrafterPickResult with drafterMode: 'ai' and narrative.
 */
async function tryAIPickProvider(_input: CPUDrafterInput): Promise<DrafterPickResult | null> {
  // No AI provider wired by default; extend here (e.g. call /api/leagues/[id]/draft/ai-pick-internal)
  // or a server-side LLM with deterministic fallback. Returning null forces CPU fallback.
  return null
}

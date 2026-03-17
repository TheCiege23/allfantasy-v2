/**
 * FallbackPolicy — defines provider fallback order and when to use deterministic-only.
 * No provider keys; server-side only. Supports: provider selector, retry, graceful degradation.
 */

import type { AIModelRole } from '@/lib/unified-ai/types'

/** Preferred order for primary explanation when multiple providers succeed. */
export const FALLBACK_PRIMARY_ORDER: AIModelRole[] = ['openai', 'grok', 'deepseek']

/** Order for analytical reasoning (e.g. specialist mode analysis role). */
export const FALLBACK_ANALYSIS_ORDER: AIModelRole[] = ['deepseek', 'openai', 'grok']

/** Order for narrative framing (e.g. specialist mode narrative role). */
export const FALLBACK_NARRATIVE_ORDER: AIModelRole[] = ['grok', 'openai', 'deepseek']

export interface FallbackPolicyConfig {
  /** Use deterministic-only when all providers fail or none configured. Default true. */
  useDeterministicWhenNoProvider: boolean
  /** Minimum number of providers to attempt before falling back. Default 1. */
  minProvidersToAttempt: number
}

const DEFAULT_CONFIG: FallbackPolicyConfig = {
  useDeterministicWhenNoProvider: true,
  minProvidersToAttempt: 1,
}

/**
 * Resolve which provider to use as primary from a list of available roles.
 * Returns first in FALLBACK_PRIMARY_ORDER that is in available, or available[0].
 */
export function resolvePrimaryProvider(available: AIModelRole[]): AIModelRole | null {
  if (available.length === 0) return null
  for (const role of FALLBACK_PRIMARY_ORDER) {
    if (available.includes(role)) return role
  }
  return available[0]
}

/**
 * Get ordered list of providers to try for a given "role" (primary, analysis, narrative).
 */
export function getFallbackOrderForRole(
  role: 'primary' | 'analysis' | 'narrative'
): AIModelRole[] {
  switch (role) {
    case 'primary':
      return [...FALLBACK_PRIMARY_ORDER]
    case 'analysis':
      return [...FALLBACK_ANALYSIS_ORDER]
    case 'narrative':
      return [...FALLBACK_NARRATIVE_ORDER]
    default:
      return [...FALLBACK_PRIMARY_ORDER]
  }
}

/**
 * Should the system return a deterministic-only response (no LLM)?
 * When true, caller should build response from envelope.deterministicPayload only.
 */
export function shouldUseDeterministicOnly(
  availableProviders: AIModelRole[],
  config: Partial<FallbackPolicyConfig> = {}
): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  if (!cfg.useDeterministicWhenNoProvider) return false
  return availableProviders.length < cfg.minProvidersToAttempt
}

export { DEFAULT_CONFIG as DEFAULT_FALLBACK_CONFIG }

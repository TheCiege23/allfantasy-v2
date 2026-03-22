/**
 * ReputationTierResolver — maps overall score to configurable tier (Legendary → Risky).
 */

import type { ReputationTier } from './types'
import { REPUTATION_TIERS, DEFAULT_REPUTATION_TIER_THRESHOLDS } from './types'

export type TierThresholdsConfig = Partial<Record<ReputationTier, { min: number; max?: number }>>

export function normalizeTierThresholdConfig(
  incoming?: TierThresholdsConfig | null
): Record<ReputationTier, { min: number; max?: number }> {
  const out: Record<ReputationTier, { min: number; max?: number }> = {
    ...DEFAULT_REPUTATION_TIER_THRESHOLDS,
  }
  if (!incoming) return out
  for (const tier of REPUTATION_TIERS) {
    const candidate = incoming[tier]
    if (!candidate || typeof candidate.min !== 'number' || !Number.isFinite(candidate.min)) continue
    const min = Math.max(0, Math.min(100, candidate.min))
    const max =
      typeof candidate.max === 'number' && Number.isFinite(candidate.max)
        ? Math.max(min, Math.min(100, candidate.max))
        : undefined
    out[tier] = { min, ...(max !== undefined ? { max } : {}) }
  }
  return out
}

/**
 * Resolve overall score (0–100) to a tier. Higher score = higher trust tier.
 */
export function resolveReputationTier(
  overallScore: number,
  thresholds: TierThresholdsConfig = {}
): ReputationTier {
  const t = normalizeTierThresholdConfig(thresholds)
  const clamped = Math.max(0, Math.min(100, overallScore))
  // Order: highest tier first (Legendary → Risky)
  for (const tier of REPUTATION_TIERS) {
    const range = t[tier]
    if (!range) continue
    if (clamped >= range.min && (range.max == null || clamped <= range.max)) return tier
  }
  return 'Risky'
}

export function getReputationTierLabel(tier: ReputationTier): string {
  return tier
}

/** Badge color hint for UI (tailwind/theme). */
export function getReputationTierBadgeColor(tier: ReputationTier): string {
  switch (tier) {
    case 'Legendary':
      return 'amber'
    case 'Elite':
      return 'emerald'
    case 'Trusted':
      return 'green'
    case 'Reliable':
      return 'blue'
    case 'Neutral':
      return 'slate'
    case 'Risky':
      return 'red'
    default:
      return 'slate'
  }
}

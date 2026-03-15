/**
 * GMTierResolver — resolve GM prestige score to tier label and badge color.
 */

import type { GMTier } from './types'
import { GM_TIERS, GM_TIER_THRESHOLDS } from './types'

export function getGMTierFromScore(score: number): GMTier {
  const s = Math.max(0, Math.min(100, score))
  for (const tier of GM_TIERS) {
    const { min, max } = GM_TIER_THRESHOLDS[tier]
    if (s >= min && (max == null || s <= max)) return tier
  }
  return 'Developing'
}

export function getGMTierLabel(tier: GMTier): string {
  return tier
}

export function getGMTierBadgeColor(tier: GMTier): string {
  switch (tier) {
    case 'Legend':
      return 'amber'
    case 'Elite':
      return 'yellow'
    case 'Veteran':
      return 'emerald'
    case 'Rising':
      return 'cyan'
    case 'Proven':
      return 'blue'
    default:
      return 'zinc'
  }
}

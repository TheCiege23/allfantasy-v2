/**
 * TierResolver — resolve total XP to tier, xpToNextTier, and progress-in-tier for progress bars.
 */

import type { XPTier } from './types'
import { XP_TIERS, XP_TIER_THRESHOLDS, XP_TO_NEXT_TIER } from './types'

export function getTierFromXP(totalXP: number): XPTier {
  const xp = Math.max(0, totalXP)
  let tier: XPTier = 'Bronze GM'
  for (const t of XP_TIERS) {
    if (xp >= XP_TIER_THRESHOLDS[t]) tier = t
  }
  return tier
}

export function getXPToNextTier(totalXP: number): number {
  const tier = getTierFromXP(totalXP)
  return XP_TO_NEXT_TIER[tier]
}

/** Progress 0–100 within current tier (for progress bar). Legendary = 100. */
export function getProgressInTier(totalXP: number): number {
  const tier = getTierFromXP(totalXP)
  const next = XP_TO_NEXT_TIER[tier]
  if (next === 0) return 100
  const threshold = XP_TIER_THRESHOLDS[tier]
  const xpInTier = totalXP - threshold
  return Math.min(100, Math.max(0, Math.round((xpInTier / next) * 100)))
}

export function getTierBadgeColor(tier: XPTier): string {
  switch (tier) {
    case 'Legendary GM':
      return 'amber'
    case 'Elite GM':
      return 'yellow'
    case 'Gold GM':
      return 'emerald'
    case 'Silver GM':
      return 'zinc'
    case 'Bronze GM':
    default:
      return 'orange'
  }
}

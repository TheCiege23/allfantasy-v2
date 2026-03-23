import { describe, expect, it } from 'vitest'

import {
  getProgressInTier,
  getTierFromXP,
  getXPRemainingToNextTier,
  getXPToNextTier,
} from '@/lib/xp-progression/TierResolver'

describe('XP tier resolver', () => {
  it('resolves tier boundaries correctly', () => {
    expect(getTierFromXP(0)).toBe('Bronze GM')
    expect(getTierFromXP(99)).toBe('Bronze GM')
    expect(getTierFromXP(100)).toBe('Silver GM')
    expect(getTierFromXP(300)).toBe('Gold GM')
    expect(getTierFromXP(600)).toBe('Elite GM')
    expect(getTierFromXP(1000)).toBe('Legendary GM')
  })

  it('returns tier spans and remaining XP correctly', () => {
    expect(getXPToNextTier(0)).toBe(100)
    expect(getXPToNextTier(100)).toBe(200)
    expect(getXPToNextTier(350)).toBe(300)
    expect(getXPToNextTier(1000)).toBe(0)

    expect(getXPRemainingToNextTier(0)).toBe(100)
    expect(getXPRemainingToNextTier(50)).toBe(50)
    expect(getXPRemainingToNextTier(250)).toBe(50)
    expect(getXPRemainingToNextTier(999)).toBe(1)
    expect(getXPRemainingToNextTier(1000)).toBe(0)
  })

  it('computes progress-in-tier percentages', () => {
    expect(getProgressInTier(0)).toBe(0)
    expect(getProgressInTier(50)).toBe(50)
    expect(getProgressInTier(100)).toBe(0)
    expect(getProgressInTier(200)).toBe(50)
    expect(getProgressInTier(450)).toBe(50)
    expect(getProgressInTier(800)).toBe(50)
    expect(getProgressInTier(1000)).toBe(100)
  })
})

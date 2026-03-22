import { describe, expect, it } from 'vitest'
import { resolveRivalryTier } from '@/lib/rivalry-engine/RivalryTierResolver'

describe('RivalryTierResolver', () => {
  it('maps default thresholds correctly', () => {
    expect(resolveRivalryTier(0)).toBe('Emerging')
    expect(resolveRivalryTier(39)).toBe('Emerging')
    expect(resolveRivalryTier(40)).toBe('Heated')
    expect(resolveRivalryTier(64)).toBe('Heated')
    expect(resolveRivalryTier(65)).toBe('Blood Feud')
    expect(resolveRivalryTier(84)).toBe('Blood Feud')
    expect(resolveRivalryTier(85)).toBe('League Classic')
    expect(resolveRivalryTier(100)).toBe('League Classic')
  })

  it('supports custom thresholds', () => {
    const tier = resolveRivalryTier(55, {
      Emerging: { min: 0, max: 29 },
      Heated: { min: 30, max: 49 },
      'Blood Feud': { min: 50, max: 79 },
      'League Classic': { min: 80 },
    })
    expect(tier).toBe('Blood Feud')
  })
})

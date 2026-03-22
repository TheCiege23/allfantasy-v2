import { describe, expect, it } from 'vitest'
import { getDramaCadenceConfig, normalizeSportForDrama } from '@/lib/drama-engine/SportDramaResolver'

describe('SportDramaResolver', () => {
  it('normalizes supported sports and aliases', () => {
    expect(normalizeSportForDrama('nfl')).toBe('NFL')
    expect(normalizeSportForDrama('NCAA Basketball')).toBe('NCAAB')
    expect(normalizeSportForDrama('NCAA Football')).toBe('NCAAF')
    expect(normalizeSportForDrama('soccer')).toBe('SOCCER')
  })

  it('returns sport-aware cadence calibration', () => {
    const nfl = getDramaCadenceConfig('NFL')
    const soccer = getDramaCadenceConfig('SOCCER')
    expect(nfl.playoffStartWeek).not.toBe(soccer.playoffStartWeek)
    expect(nfl.upsetScoreMultiplier).toBeGreaterThan(0)
    expect(soccer.regularSeasonLength).toBeGreaterThan(0)
  })
})

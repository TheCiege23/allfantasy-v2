import { describe, expect, it } from 'vitest'
import { getBehaviorCalibration, normalizeSportForPsych } from '@/lib/psychological-profiles/SportBehaviorResolver'

describe('sport behavior resolver', () => {
  it('normalizes all supported sport aliases', () => {
    expect(normalizeSportForPsych('nfl')).toBe('NFL')
    expect(normalizeSportForPsych('NCAA Basketball')).toBe('NCAAB')
    expect(normalizeSportForPsych('NCAA Football')).toBe('NCAAF')
    expect(normalizeSportForPsych('soccer')).toBe('SOCCER')
  })

  it('returns sport-specific calibration', () => {
    const nfl = getBehaviorCalibration('NFL')
    const nba = getBehaviorCalibration('NBA')
    expect(nfl.lateTradeWeekThreshold).not.toBe(nba.lateTradeWeekThreshold)
    expect(nfl.lineupVolatilityWeight).toBeGreaterThan(0)
    expect(nba.rookiePreferenceWeight).toBeGreaterThan(0)
  })
})

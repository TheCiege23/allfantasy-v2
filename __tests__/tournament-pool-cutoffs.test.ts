import { describe, expect, it } from 'vitest'

import { TOURNAMENT_PARTICIPANT_POOL_SIZES } from '@/lib/tournament-mode/constants'
import {
  FEEDER_LEAGUES_BY_POOL,
  getFeederLeagueCountForPool,
  TOURNAMENT_POOL_TIERS,
} from '@/lib/tournament-mode/tournament-sport-cutoffs'

describe('tournament pool cutoffs', () => {
  it('exposes the expanded participant pool sizes across shared constants', () => {
    expect(TOURNAMENT_PARTICIPANT_POOL_SIZES).toEqual([32, 64, 72, 96, 128, 144, 160, 192, 216, 224])
    expect(TOURNAMENT_POOL_TIERS).toEqual(TOURNAMENT_PARTICIPANT_POOL_SIZES)
  })

  it('returns feeder league counts for every supported tournament pool', () => {
    expect(FEEDER_LEAGUES_BY_POOL).toMatchObject({
      32: 2,
      64: 5,
      72: 6,
      96: 8,
      128: 10,
      144: 12,
      160: 13,
      192: 16,
      216: 18,
      224: 18,
    })
  })

  it('falls back to computed feeder league counts for non-tier pool sizes', () => {
    expect(getFeederLeagueCountForPool(200)).toBe(16)
    expect(getFeederLeagueCountForPool(24)).toBe(2)
  })
})
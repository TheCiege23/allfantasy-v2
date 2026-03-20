import { describe, expect, it } from 'vitest'
import { normalizeStatPayload } from '@/lib/schedule-stats/StatNormalizationService'

describe('StatNormalizationService soccer + IDP aliases', () => {
  it('normalizes soccer provider aliases to canonical scoring keys', () => {
    const normalized = normalizeStatPayload('SOCCER', {
      goals: 1,
      assists: 1,
      sot: 3,
      shots: 5,
      kp: 2,
      cs: 1,
      ga: 2,
      mins: 90,
      yc: 1,
    })

    expect(normalized).toEqual(
      expect.objectContaining({
        goal: 1,
        assist: 1,
        shot_on_target: 3,
        shot: 5,
        key_pass: 2,
        clean_sheet: 1,
        goal_allowed: 2,
        minutes_played: 90,
        yellow_card: 1,
      })
    )
  })

  it('normalizes IDP-specific aliases to canonical idp_* stat keys for scoring', () => {
    const normalized = normalizeStatPayload('NFL', {
      solo_tackle: 6,
      assist_tackle: 2,
      tackle_for_loss: 1,
      qb_hit: 3,
      pass_defended: 2,
      forced_fumble: 1,
      fumble_recovery: 1,
      defensive_touchdown: 1,
      def_sack: 2,
      def_interception: 1,
      def_safety: 1,
    })

    expect(normalized).toEqual(
      expect.objectContaining({
        idp_solo_tackle: 6,
        idp_assist_tackle: 2,
        idp_tackle_for_loss: 1,
        idp_qb_hit: 3,
        idp_pass_defended: 2,
        idp_forced_fumble: 1,
        idp_fumble_recovery: 1,
        idp_defensive_touchdown: 1,
        idp_sack: 2,
        idp_interception: 1,
        idp_safety: 1,
      })
    )
  })
})

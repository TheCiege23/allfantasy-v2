import { describe, expect, it } from 'vitest'
import { LeagueSettingsValidator, validateLeagueSettings } from '@/lib/league-settings-validation'

describe('LeagueSettingsValidator', () => {
  it('rejects auction draft without a positive budget', () => {
    const result = validateLeagueSettings({
      league_type: 'redraft',
      draft_type: 'auction',
      auction_budget_per_team: 0,
    })

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.toLowerCase().includes('auction draft requires a positive budget'))).toBe(true)
  })

  it('rejects devy league without devy slots', () => {
    const result = validateLeagueSettings({
      league_type: 'devy',
      roster_mode: 'dynasty',
      devy_rounds: [1, 2],
      devy_slots: 0,
    })

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.toLowerCase().includes('devy slot'))).toBe(true)
  })

  it('rejects c2c league without college pool capacity', () => {
    const result = validateLeagueSettings({
      league_type: 'c2c',
      roster_mode: 'dynasty',
      c2c_college_rounds: [1, 2, 3],
      c2c_college_roster_size: 0,
    })

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.toLowerCase().includes('college pool capacity'))).toBe(true)
  })

  it('accepts valid auction/devy/c2c settings combinations', () => {
    const auction = validateLeagueSettings({
      league_type: 'redraft',
      draft_type: 'auction',
      auction_budget_per_team: 200,
    })
    const devy = validateLeagueSettings({
      league_type: 'devy',
      roster_mode: 'dynasty',
      devy_rounds: [1, 2, 3],
      devy_slots: 6,
      league_size: 12,
    })
    const c2cViaClass = LeagueSettingsValidator.validate({
      league_type: 'c2c',
      league_variant: 'merged_devy_c2c',
      roster_mode: 'dynasty',
      c2c_college_rounds: [1, 2, 3, 4],
      c2c_college_roster_size: 20,
      league_size: 12,
    })

    expect(auction.valid).toBe(true)
    expect(devy.valid).toBe(true)
    expect(c2cViaClass.valid).toBe(true)
  })
})

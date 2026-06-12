import { describe, expect, it } from 'vitest'
import { getLeagueDefaults } from '@/lib/league-defaults/getLeagueDefaults'

describe('getLeagueDefaults', () => {
  it.each([
    ['NFL redraft snake', { sport: 'NFL', format: 'redraft', draftType: 'snake', scoringPreset: 'fb_half_ppr' }],
    ['NFL dynasty snake', { sport: 'NFL', format: 'dynasty', draftType: 'snake', scoringPreset: 'fb_dynasty_ppr' }],
    ['NFL IDP snake', { sport: 'NFL', format: 'idp', draftType: 'snake', scoringPreset: 'fb_idp_ppr' }],
    ['NCAAF devy snake', { sport: 'NCAAF', format: 'devy', draftType: 'snake', scoringPreset: 'ncaaf_devy_ppr' }],
    ['NCAAF C2C snake', { sport: 'NCAAF', format: 'c2c', draftType: 'snake', scoringPreset: 'ncaaf_c2c_ppr' }],
  ])('returns durable foundation defaults for %s', (_label, input) => {
    const defaults = getLeagueDefaults({ ...input, managerCount: 12 })

    expect(defaults.managerCount).toBe(12)
    expect(defaults.engineDraftType).toBe('snake')
    expect(defaults.rosterSettings).toBeTruthy()
    expect(defaults.scoringSettings.scoringTemplateId).toBe(input.scoringPreset)
    expect(defaults.draftSettings.rounds).toBeGreaterThan(0)
    expect(defaults.playoffSettings.playoffTeams).toBeGreaterThan(0)
    expect(defaults.conceptPreset.requiredDataFeeds).toEqual(expect.any(Array))
    expect(defaults.conceptPreset.aiEnabledFeatures).toEqual(expect.any(Array))
  })

  it('marks NCAAF devy and C2C with beta data dependencies', () => {
    const devy = getLeagueDefaults({
      sport: 'NCAAF',
      format: 'devy',
      draftType: 'snake',
      scoringPreset: 'ncaaf_devy_ppr',
      managerCount: 12,
    })
    const c2c = getLeagueDefaults({
      sport: 'NCAAF',
      format: 'c2c',
      draftType: 'snake',
      scoringPreset: 'ncaaf_c2c_ppr',
      managerCount: 12,
    })

    expect(devy.conceptPreset.readiness).toMatch(/beta|launch_ready/)
    expect(devy.draftSettings.devyConfig).toEqual(expect.objectContaining({ enabled: true }))
    expect(c2c.conceptPreset.requiredDataFeeds.some((feed) => feed.includes('college'))).toBe(true)
    expect(c2c.draftSettings.c2cConfig).toEqual(expect.objectContaining({ enabled: true }))
  })
})

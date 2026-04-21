import { describe, expect, it } from 'vitest'

import {
  listScoringPresetOptions,
  resolveScoringPresetId,
} from '@/lib/league-creation-preset/scoring-presets'

describe('create-league scoring presets', () => {
  it('includes football presets for survivor leagues', () => {
    const options = listScoringPresetOptions({
      leagueType: 'survivor',
      sport: 'NFL',
      idpSelected: false,
    })

    expect(options.map((option) => option.id)).toContain('fb_half_ppr')
  })

  it('falls back to survivor default when the current preset is invalid', () => {
    const presetId = resolveScoringPresetId('nba_points', {
      leagueType: 'survivor',
      sport: 'NFL',
      idpSelected: false,
    })

    expect(presetId).toBe('fb_half_ppr')
  })
})
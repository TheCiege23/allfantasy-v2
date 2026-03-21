import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveSportDefaultsMock = vi.fn()
const getLeagueCreationPresetMock = vi.fn()
const leagueSportToSportTypeMock = vi.fn()

vi.mock('@/lib/sport-defaults/SportDefaultsResolver', () => ({
  resolveSportDefaults: resolveSportDefaultsMock,
}))

vi.mock('@/lib/multi-sport/MultiSportLeagueService', () => ({
  getLeagueCreationPreset: getLeagueCreationPresetMock,
}))

vi.mock('@/lib/multi-sport/SportConfigResolver', () => ({
  leagueSportToSportType: leagueSportToSportTypeMock,
}))

describe('SportLeaguePresetService variant template resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    leagueSportToSportTypeMock.mockReturnValue('NFL')
    resolveSportDefaultsMock.mockReturnValue({
      metadata: { sport_type: 'NFL' },
      league: {},
      roster: {},
      scoring: {},
      draft: {},
      waiver: {},
      teamMetadata: null,
    })
    getLeagueCreationPresetMock.mockResolvedValue({
      sport: 'NFL',
      sportDisplayName: 'NFL',
      sportEmoji: '🏈',
      defaultFormat: 'IDP',
      rosterTemplate: { templateId: 'r1', name: 'Roster', formatType: 'IDP', slots: [] },
      scoringTemplate: { templateId: 's1', name: 'Scoring', formatType: 'IDP', rules: [] },
    })
  })

  it('passes variant-derived format type into creation preset template resolver', async () => {
    const { getFullLeaguePreset } = await import('@/lib/sport-defaults/SportLeaguePresetService')

    await getFullLeaguePreset('NFL', 'IDP')

    expect(resolveSportDefaultsMock).toHaveBeenCalledWith('NFL', 'IDP')
    expect(getLeagueCreationPresetMock).toHaveBeenCalledWith('NFL', 'IDP')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const getRosterTemplateForLeagueMock = vi.fn()
const resolveLeagueRosterConfigMock = vi.fn()

vi.mock('@/lib/multi-sport/MultiSportRosterService', () => ({
  getRosterTemplateForLeague: getRosterTemplateForLeagueMock,
  resolveLeagueRosterConfig: resolveLeagueRosterConfigMock,
}))

describe('LeagueRosterBootstrapService format normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getRosterTemplateForLeagueMock.mockResolvedValue({
      templateId: 'default-NFL-IDP',
      sportType: 'NFL',
      name: 'Default NFL IDP',
      formatType: 'IDP',
      slots: [],
    })
    resolveLeagueRosterConfigMock.mockResolvedValue({
      templateId: 'default-NFL-IDP',
      overrides: null,
    })
  })

  it('normalizes DYNASTY_IDP to IDP for template reads', async () => {
    const { getLeagueRosterTemplate } = await import('@/lib/roster-defaults/LeagueRosterBootstrapService')

    await getLeagueRosterTemplate('NFL', 'DYNASTY_IDP')

    expect(getRosterTemplateForLeagueMock).toHaveBeenCalledWith('NFL', 'IDP')
  })

  it('normalizes DYNASTY_IDP during bootstrap path too', async () => {
    const { bootstrapLeagueRoster } = await import('@/lib/roster-defaults/LeagueRosterBootstrapService')

    await bootstrapLeagueRoster('league-1', 'NFL', 'DYNASTY_IDP')

    expect(resolveLeagueRosterConfigMock).toHaveBeenCalledWith('league-1', 'NFL', 'IDP')
    expect(getRosterTemplateForLeagueMock).toHaveBeenCalledWith('NFL', 'IDP')
  })
})

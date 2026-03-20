import { beforeEach, describe, expect, it, vi } from 'vitest'

const getRosterTemplateMock = vi.fn()
const getOrCreateLeagueRosterConfigMock = vi.fn()

vi.mock('@/lib/multi-sport/RosterTemplateService', () => ({
  getRosterTemplate: getRosterTemplateMock,
  getOrCreateLeagueRosterConfig: getOrCreateLeagueRosterConfigMock,
}))

describe('RosterTemplateResolver variant normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getRosterTemplateMock.mockResolvedValue({
      templateId: 'default-NFL-IDP',
      sportType: 'NFL',
      name: 'Default NFL IDP',
      formatType: 'IDP',
      slots: [],
    })
    getOrCreateLeagueRosterConfigMock.mockResolvedValue({
      templateId: 'default-NFL-IDP',
      overrides: null,
    })
  })

  it('normalizes DYNASTY_IDP to IDP when resolving roster template', async () => {
    const { resolveRosterTemplate } = await import('@/lib/roster-defaults/RosterTemplateResolver')

    await resolveRosterTemplate('NFL', 'DYNASTY_IDP')

    expect(getRosterTemplateMock).toHaveBeenCalledWith('NFL', 'IDP')
  })

  it('normalizes DYNASTY_IDP to IDP for league-level roster bootstrap resolution', async () => {
    const { resolveRosterTemplateForLeague } = await import('@/lib/roster-defaults/RosterTemplateResolver')

    await resolveRosterTemplateForLeague('league-idp-1', 'NFL', 'DYNASTY_IDP')

    expect(getOrCreateLeagueRosterConfigMock).toHaveBeenCalledWith('league-idp-1', 'NFL', 'IDP')
    expect(getRosterTemplateMock).toHaveBeenCalledWith('NFL', 'IDP')
  })
})

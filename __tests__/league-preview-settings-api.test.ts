import { beforeEach, describe, expect, it, vi } from 'vitest'

const getInitialSettingsForCreationMock = vi.fn()
const getSettingsPreviewSummaryMock = vi.fn()

vi.mock('@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator', () => ({
  getInitialSettingsForCreation: getInitialSettingsForCreationMock,
  getSettingsPreviewSummary: getSettingsPreviewSummaryMock,
}))

describe('GET /api/league/preview-settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getInitialSettingsForCreationMock.mockReturnValue({
      roster_mode: 'dynasty',
      superflex: true,
      playoff_team_count: 6,
    })

    getSettingsPreviewSummaryMock.mockReturnValue({
      playoff_team_count: 6,
      regular_season_length: 18,
      schedule_unit: 'week',
      waiver_mode: 'faab',
      roster_mode: 'dynasty',
      lock_time_behavior: 'first_game',
    })
  })

  it('builds preview and summary from unified orchestrator with normalized sport/variant', async () => {
    const { GET } = await import('@/app/api/league/preview-settings/route')

    const req = new Request('http://localhost/api/league/preview-settings?sport=nfl&variant=idp&superflex=true&dynasty=true')
    const res = await GET(req as any)

    expect(res.status).toBe(200)
    expect(getInitialSettingsForCreationMock).toHaveBeenCalledWith('NFL', 'idp', {
      superflex: true,
      roster_mode: 'dynasty',
    })
    expect(getSettingsPreviewSummaryMock).toHaveBeenCalledWith('NFL', 'idp', {
      superflex: true,
      roster_mode: 'dynasty',
    })

    const body = await res.json()
    expect(body.sport).toBe('NFL')
    expect(body.variant).toBe('idp')
    expect(body.initialSettings).toEqual(expect.objectContaining({ roster_mode: 'dynasty' }))
    expect(body.summary).toEqual(expect.objectContaining({ playoff_team_count: 6 }))
  })

  it('falls back to NFL when sport is invalid', async () => {
    const { GET } = await import('@/app/api/league/preview-settings/route')

    const req = new Request('http://localhost/api/league/preview-settings?sport=cricket')
    const res = await GET(req as any)

    expect(res.status).toBe(200)
    expect(getInitialSettingsForCreationMock).toHaveBeenCalledWith('NFL', null, {
      superflex: false,
      roster_mode: undefined,
    })
  })
})

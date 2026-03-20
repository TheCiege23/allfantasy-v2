import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveLeaguePresetPipelineMock = vi.fn()
const buildSettingsPreviewMock = vi.fn()
const getSettingsPreviewSummaryMock = vi.fn()
const runLeagueInitializationMock = vi.fn()
const resolveSportVariantContextMock = vi.fn()

vi.mock('@/lib/league-defaults-orchestrator/LeaguePresetResolutionPipeline', () => ({
  resolveLeaguePresetPipeline: resolveLeaguePresetPipelineMock,
}))

vi.mock('@/lib/league-defaults-orchestrator/LeagueSettingsPreviewBuilder', () => ({
  buildSettingsPreview: buildSettingsPreviewMock,
  getSettingsPreviewSummary: getSettingsPreviewSummaryMock,
}))

vi.mock('@/lib/league-defaults-orchestrator/LeagueCreationInitializationService', () => ({
  runLeagueInitialization: runLeagueInitializationMock,
}))

vi.mock('@/lib/league-defaults-orchestrator/SportVariantContextResolver', () => ({
  resolveSportVariantContext: resolveSportVariantContextMock,
}))

describe('LeagueDefaultsOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    resolveSportVariantContextMock.mockReturnValue({
      sport: 'NFL',
      variant: 'IDP',
      formatType: 'IDP',
      isNflIdp: true,
      isSoccer: false,
      displayLabel: 'NFL IDP',
    })

    resolveLeaguePresetPipelineMock.mockResolvedValue({
      payload: {
        sport: 'NFL',
        leagueVariant: 'IDP',
      },
      initialSettingsForPreview: {
        roster_mode: 'redraft',
        playoff_team_count: 6,
      },
      context: {
        sport: 'NFL',
        variant: 'IDP',
        formatType: 'IDP',
        isNflIdp: true,
        isSoccer: false,
        displayLabel: 'NFL IDP',
      },
    })

    buildSettingsPreviewMock.mockReturnValue({
      roster_mode: 'dynasty',
      playoff_team_count: 6,
      superflex: true,
    })

    getSettingsPreviewSummaryMock.mockReturnValue({
      playoff_team_count: 6,
      regular_season_length: 18,
      schedule_unit: 'week',
      waiver_mode: 'faab',
      roster_mode: 'dynasty',
      lock_time_behavior: 'first_game',
    })

    runLeagueInitializationMock.mockResolvedValue({
      ok: true,
      roster: { created: 1, updated: 0 },
      scoring: { created: 1, updated: 0 },
      playerPool: { created: 1, updated: 0 },
    })
  })

  it('getCreationPayload resolves through unified preset pipeline', async () => {
    const { getCreationPayload } = await import('@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator')

    const payload = await getCreationPayload('NFL', 'IDP')

    expect(resolveLeaguePresetPipelineMock).toHaveBeenCalledWith('NFL', 'IDP')
    expect(payload).toEqual({ sport: 'NFL', leagueVariant: 'IDP' })
  })

  it('getInitialSettingsForCreation resolves through preview builder', async () => {
    const { getInitialSettingsForCreation } = await import('@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator')

    const settings = getInitialSettingsForCreation('NFL', 'IDP', {
      superflex: true,
      roster_mode: 'dynasty',
    })

    expect(buildSettingsPreviewMock).toHaveBeenCalledWith('NFL', 'IDP', {
      superflex: true,
      roster_mode: 'dynasty',
    })
    expect(settings).toEqual(
      expect.objectContaining({
        roster_mode: 'dynasty',
        superflex: true,
      })
    )
  })

  it('getCreationPayloadAndSettings uses shared context and honors overrides', async () => {
    const { getCreationPayloadAndSettings } = await import('@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator')

    const result = await getCreationPayloadAndSettings('NFL', 'IDP', {
      superflex: true,
      roster_mode: 'dynasty',
    })

    expect(resolveLeaguePresetPipelineMock).toHaveBeenCalledWith('NFL', 'IDP')
    expect(buildSettingsPreviewMock).toHaveBeenCalledWith('NFL', 'IDP', {
      superflex: true,
      roster_mode: 'dynasty',
    })
    expect(getSettingsPreviewSummaryMock).toHaveBeenCalledWith('NFL', 'IDP', {
      superflex: true,
      roster_mode: 'dynasty',
    })
    expect(result.context).toEqual(
      expect.objectContaining({
        sport: 'NFL',
        variant: 'IDP',
      })
    )
    expect(result.initialSettings).toEqual(
      expect.objectContaining({
        roster_mode: 'dynasty',
      })
    )
  })

  it('getCreationPayloadAndSettings reuses pipeline preview settings when overrides are omitted', async () => {
    const { getCreationPayloadAndSettings } = await import('@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator')

    const result = await getCreationPayloadAndSettings('NFL', 'IDP')

    expect(buildSettingsPreviewMock).not.toHaveBeenCalled()
    expect(result.initialSettings).toEqual({
      roster_mode: 'redraft',
      playoff_team_count: 6,
    })
    expect(getSettingsPreviewSummaryMock).toHaveBeenCalledWith('NFL', 'IDP', undefined)
  })

  it('runPostCreateInitialization delegates to unified initialization service', async () => {
    const { runPostCreateInitialization } = await import('@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator')

    const result = await runPostCreateInitialization('league-1', 'NFL', 'IDP')

    expect(runLeagueInitializationMock).toHaveBeenCalledWith('league-1', 'NFL', 'IDP')
    expect(result).toEqual(expect.objectContaining({ ok: true }))
  })
})

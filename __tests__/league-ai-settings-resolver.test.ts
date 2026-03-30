import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  leagueFindUniqueMock,
  leagueUpdateMock,
  getDraftUISettingsForLeagueMock,
  updateDraftUISettingsMock,
} = vi.hoisted(() => ({
  leagueFindUniqueMock: vi.fn(),
  leagueUpdateMock: vi.fn(),
  getDraftUISettingsForLeagueMock: vi.fn(),
  updateDraftUISettingsMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    league: {
      findUnique: leagueFindUniqueMock,
      update: leagueUpdateMock,
    },
  },
}))

vi.mock('@/lib/draft-defaults/DraftUISettingsResolver', () => ({
  getDraftUISettingsForLeague: getDraftUISettingsForLeagueMock,
  updateDraftUISettings: updateDraftUISettingsMock,
}))

describe('LeagueAISettingsResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps orphan AI feature to true only for ai mode', async () => {
    leagueFindUniqueMock.mockResolvedValueOnce({
      settings: {
        ai_feature_trade_analyzer_enabled: false,
      },
    })
    getDraftUISettingsForLeagueMock.mockResolvedValueOnce({
      orphanTeamAiManagerEnabled: true,
      orphanDrafterMode: 'cpu',
    })

    const { getLeagueAISettings } = await import('@/lib/ai-settings/LeagueAISettingsResolver')
    const result = await getLeagueAISettings('league-ai-1')

    expect(result.tradeAnalyzerEnabled).toBe(false)
    expect(result.aiDraftManagerOrphanEnabled).toBe(false)
  })

  it('enabling orphan AI feature sets draft manager to ai mode', async () => {
    leagueFindUniqueMock.mockResolvedValueOnce({ settings: {} })
    leagueUpdateMock.mockResolvedValueOnce({ id: 'league-ai-2' })
    updateDraftUISettingsMock.mockResolvedValueOnce({})
    getDraftUISettingsForLeagueMock.mockResolvedValueOnce({
      orphanTeamAiManagerEnabled: true,
      orphanDrafterMode: 'ai',
    })

    const { updateLeagueAISettings } = await import('@/lib/ai-settings/LeagueAISettingsResolver')
    const result = await updateLeagueAISettings('league-ai-2', {
      aiDraftManagerOrphanEnabled: true,
      aiChatChimmyEnabled: false,
    })

    expect(updateDraftUISettingsMock).toHaveBeenCalledWith('league-ai-2', {
      orphanTeamAiManagerEnabled: true,
      orphanDrafterMode: 'ai',
    })
    const updatePayload = leagueUpdateMock.mock.calls[0]?.[0]?.data?.settings as Record<string, unknown>
    expect(updatePayload.ai_feature_ai_chat_chimmy_enabled).toBe(false)
    expect(result.aiDraftManagerOrphanEnabled).toBe(true)
  })

  it('disabling orphan AI feature turns orphan manager off and cpu mode', async () => {
    leagueFindUniqueMock.mockResolvedValueOnce({ settings: {} })
    leagueUpdateMock.mockResolvedValueOnce({ id: 'league-ai-3' })
    updateDraftUISettingsMock.mockResolvedValueOnce({})
    getDraftUISettingsForLeagueMock.mockResolvedValueOnce({
      orphanTeamAiManagerEnabled: false,
      orphanDrafterMode: 'cpu',
    })

    const { updateLeagueAISettings } = await import('@/lib/ai-settings/LeagueAISettingsResolver')
    const result = await updateLeagueAISettings('league-ai-3', {
      aiDraftManagerOrphanEnabled: false,
    })

    expect(updateDraftUISettingsMock).toHaveBeenCalledWith('league-ai-3', {
      orphanTeamAiManagerEnabled: false,
      orphanDrafterMode: 'cpu',
    })
    expect(result.aiDraftManagerOrphanEnabled).toBe(false)
  })
})

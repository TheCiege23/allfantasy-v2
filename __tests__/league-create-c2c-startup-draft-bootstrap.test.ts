import { beforeEach, describe, expect, it, vi } from 'vitest'

const { upsertLeagueWaiverSettingsMock, upsertC2CConfigMock } = vi.hoisted(() => ({
  upsertLeagueWaiverSettingsMock: vi.fn().mockResolvedValue(undefined),
  upsertC2CConfigMock: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/waiver-wire', () => ({
  upsertLeagueWaiverSettings: upsertLeagueWaiverSettingsMock,
}))

vi.mock('@/lib/merged-devy-c2c/C2CLeagueConfig', () => ({
  upsertC2CConfig: upsertC2CConfigMock,
}))

describe('runLegacyWizardSpecialtyBootstrapsAfterLeagueCreate C2C startup draft mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps c2c_auction startup draft to auction in C2C config', async () => {
    const { runLegacyWizardSpecialtyBootstrapsAfterLeagueCreate } = await import(
      '@/lib/league-creation/legacyWizardSpecialtyBootstraps'
    )

    await runLegacyWizardSpecialtyBootstrapsAfterLeagueCreate({
      league: { id: 'league-c2c-1', name: 'C2C League', sport: 'NFL', leagueSize: 12 },
      userId: 'user-1',
      name: 'C2C League',
      sport: 'NFL',
      settingsWizard: {
        c2c_startup_mode: 'merged',
        c2c_college_roster_size: 24,
      },
      initialSettings: {},
      flags: {
        isGuillotine: false,
        isSalaryCap: false,
        isSurvivor: false,
        isZombie: false,
        isDevy: false,
        isBigBrother: false,
        isC2C: true,
        effectiveDynasty: false,
        isIdpRequested: false,
      },
      requestedDraftType: 'c2c_auction',
    })

    expect(upsertC2CConfigMock).toHaveBeenCalledTimes(1)
    expect(upsertC2CConfigMock).toHaveBeenCalledWith(
      'league-c2c-1',
      expect.objectContaining({
        startupDraftType: 'auction',
      }),
    )
  })
})

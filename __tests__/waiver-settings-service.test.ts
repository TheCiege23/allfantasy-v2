import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  leagueFindUniqueMock,
  leagueWaiverSettingsFindUniqueMock,
  leagueWaiverSettingsUpsertMock,
} = vi.hoisted(() => ({
  leagueFindUniqueMock: vi.fn(),
  leagueWaiverSettingsFindUniqueMock: vi.fn(),
  leagueWaiverSettingsUpsertMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    league: {
      findUnique: leagueFindUniqueMock,
    },
    leagueWaiverSettings: {
      findUnique: leagueWaiverSettingsFindUniqueMock,
      upsert: leagueWaiverSettingsUpsertMock,
    },
  },
}))

describe('waiver settings service fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses league.settings waiver overrides when db row is missing', async () => {
    leagueFindUniqueMock.mockResolvedValueOnce({
      id: 'league-ovr',
      sport: 'NFL',
      leagueVariant: 'SUPERFLEX',
      settings: {
        waiver_type: 'reverse_standings',
        waiver_processing_days: [4],
        waiver_processing_time_utc: '09:30',
        waiver_max_claims_per_period: 8,
        faab_budget: 250,
        waiver_claim_priority_behavior: 'reverse_standings',
        waiver_game_lock_behavior: 'first_game',
        waiver_free_agent_unlock_behavior: 'instant',
      },
    })
    leagueWaiverSettingsFindUniqueMock.mockResolvedValueOnce(null)

    const { getEffectiveLeagueWaiverSettings } = await import('@/lib/waiver-wire/settings-service')
    const result = await getEffectiveLeagueWaiverSettings('league-ovr')

    expect(result).toMatchObject({
      leagueId: 'league-ovr',
      waiverType: 'reverse_standings',
      processingDayOfWeek: 4,
      processingTimeUtc: '09:30',
      claimLimitPerPeriod: 8,
      faabBudget: 250,
      tiebreakRule: 'reverse_standings',
      lockType: 'first_game',
      instantFaAfterClear: true,
    })
  })

  it('falls back to sport defaults when neither row nor overrides exist', async () => {
    leagueFindUniqueMock.mockResolvedValueOnce({
      id: 'league-default',
      sport: 'NCAAB',
      leagueVariant: 'STANDARD',
      settings: {},
    })
    leagueWaiverSettingsFindUniqueMock.mockResolvedValueOnce(null)

    const { getEffectiveLeagueWaiverSettings } = await import('@/lib/waiver-wire/settings-service')
    const result = await getEffectiveLeagueWaiverSettings('league-default')

    expect(result).toMatchObject({
      leagueId: 'league-default',
      waiverType: 'rolling',
      processingDayOfWeek: 1,
      processingTimeUtc: '12:00',
      claimLimitPerPeriod: 12,
      faabBudget: null,
      tiebreakRule: 'priority_lowest_first',
      lockType: 'first_game',
      instantFaAfterClear: false,
    })
  })

  it('prefers persisted waiver row over defaults/overrides', async () => {
    leagueFindUniqueMock.mockResolvedValueOnce({
      id: 'league-row',
      sport: 'SOCCER',
      leagueVariant: 'STANDARD',
      settings: {
        waiver_type: 'faab',
      },
    })
    leagueWaiverSettingsFindUniqueMock.mockResolvedValueOnce({
      waiverType: 'standard',
      processingDayOfWeek: 5,
      processingTimeUtc: '08:00',
      claimLimitPerPeriod: 3,
      faabBudget: 20,
      faabResetDate: null,
      tiebreakRule: 'earliest_claim',
      lockType: 'manual',
      instantFaAfterClear: false,
    })

    const { getEffectiveLeagueWaiverSettings } = await import('@/lib/waiver-wire/settings-service')
    const result = await getEffectiveLeagueWaiverSettings('league-row')

    expect(result).toMatchObject({
      leagueId: 'league-row',
      waiverType: 'standard',
      processingDayOfWeek: 5,
      processingTimeUtc: '08:00',
      claimLimitPerPeriod: 3,
      faabBudget: 20,
      tiebreakRule: 'earliest_claim',
      lockType: 'manual',
      instantFaAfterClear: false,
    })
  })

  it('upsert uses defaults for undefined fields and respects explicit nulls', async () => {
    leagueFindUniqueMock.mockResolvedValueOnce({
      id: 'league-upsert',
      sport: 'SOCCER',
      leagueVariant: 'STANDARD',
    })
    leagueWaiverSettingsFindUniqueMock.mockResolvedValueOnce(null)
    leagueWaiverSettingsUpsertMock.mockResolvedValueOnce({ leagueId: 'league-upsert' })

    const { upsertLeagueWaiverSettings } = await import('@/lib/waiver-wire/settings-service')
    await upsertLeagueWaiverSettings('league-upsert', {
      processingTimeUtc: null,
      claimLimitPerPeriod: 5,
      instantFaAfterClear: false,
    })

    expect(leagueWaiverSettingsUpsertMock).toHaveBeenCalledTimes(1)
    const payload = leagueWaiverSettingsUpsertMock.mock.calls[0]?.[0]
    expect(payload.where).toEqual({ leagueId: 'league-upsert' })
    expect(payload.create).toMatchObject({
      leagueId: 'league-upsert',
      waiverType: 'fcfs',
      processingDayOfWeek: null,
      processingTimeUtc: null,
      claimLimitPerPeriod: 5,
      faabBudget: null,
      tiebreakRule: 'earliest_claim',
      lockType: 'slate_lock',
      instantFaAfterClear: false,
    })
  })
})

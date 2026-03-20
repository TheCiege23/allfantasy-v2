import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.fn()
const leagueFindFirstMock = vi.fn()
const leagueCreateMock = vi.fn()
const getInitialSettingsForCreationMock = vi.fn()
const validateLeagueSettingsMock = vi.fn()
const validateLeagueFeatureFlagsMock = vi.fn()
const runPostCreateInitializationMock = vi.fn()
const upsertIdpLeagueConfigMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/auth-guard', () => ({
  requireVerifiedUser: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    league: {
      findFirst: leagueFindFirstMock,
      create: leagueCreateMock,
    },
  },
}))

vi.mock('@/lib/viral-loop', () => ({
  buildLeagueInviteUrl: vi.fn(() => 'https://invite.test/league'),
}))

vi.mock('@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator', () => ({
  getInitialSettingsForCreation: getInitialSettingsForCreationMock,
  runPostCreateInitialization: runPostCreateInitializationMock,
}))

vi.mock('@/lib/league-settings-validation', () => ({
  validateLeagueSettings: validateLeagueSettingsMock,
}))

vi.mock('@/lib/sport-defaults/SportFeatureFlagsService', () => ({
  validateLeagueFeatureFlags: validateLeagueFeatureFlagsMock,
}))

vi.mock('@/lib/idp', () => ({
  upsertIdpLeagueConfig: upsertIdpLeagueConfigMock,
}))

vi.mock('@/lib/dynasty-core/DynastySettingsService', () => ({
  upsertDynastyConfig: vi.fn().mockResolvedValue({ leagueId: 'league-idp-1' }),
}))

describe('POST /api/league/create wizard NFL DYNASTY_IDP', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    leagueFindFirstMock.mockResolvedValue(null)
    leagueCreateMock.mockResolvedValue({
      id: 'league-idp-1',
      name: 'IDP Wizard League',
      sport: 'NFL',
    })

    getInitialSettingsForCreationMock.mockImplementation((_sport: string, variant: string | undefined) => {
      const isIdp = String(variant ?? '').toUpperCase() === 'DYNASTY_IDP'
      return {
        sport_type: 'NFL',
        roster_mode: 'dynasty',
        roster_format_type: isIdp ? 'IDP' : 'standard',
        scoring_format_type: isIdp ? 'IDP' : 'PPR',
        starter_slots: isIdp
          ? { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DST: 1, DE: 2, DT: 1, LB: 2, CB: 2, S: 2 }
          : { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DST: 1 },
        bench_slots: isIdp ? 9 : 7,
      }
    })

    validateLeagueSettingsMock.mockReturnValue({ valid: true, errors: [] })
    validateLeagueFeatureFlagsMock.mockResolvedValue({ valid: true, disallowed: [] })
    runPostCreateInitializationMock.mockResolvedValue({ ok: true })
    upsertIdpLeagueConfigMock.mockResolvedValue({ leagueId: 'league-idp-1' })
  })

  it('persists DYNASTY_IDP variant and boots IDP lineup settings through post-create initialization', async () => {
    const { POST } = await import('@/app/api/league/create/route')

    const req = new Request('http://localhost/api/league/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'IDP Wizard League',
        platform: 'manual',
        sport: 'NFL',
        leagueType: 'dynasty',
        leagueVariant: 'DYNASTY_IDP',
        leagueSize: 12,
        isDynasty: true,
        settings: {
          idp_roster_preset: 'advanced',
          idp_scoring_preset: 'balanced',
        },
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(leagueCreateMock).toHaveBeenCalledTimes(1)
    const createData = leagueCreateMock.mock.calls[0]?.[0]?.data
    expect(createData.sport).toBe('NFL')
    expect(createData.leagueVariant).toBe('DYNASTY_IDP')
    expect(createData.settings).toEqual(
      expect.objectContaining({
        roster_format_type: 'IDP',
        scoring_format_type: 'IDP',
        starter_slots: expect.objectContaining({ DE: 2, DT: 1, LB: 2, CB: 2, S: 2 }),
      })
    )

    expect(runPostCreateInitializationMock).toHaveBeenCalledWith('league-idp-1', 'NFL', 'DYNASTY_IDP')
    expect(upsertIdpLeagueConfigMock).toHaveBeenCalledWith(
      'league-idp-1',
      expect.objectContaining({
        rosterPreset: 'advanced',
        scoringPreset: 'balanced',
      })
    )
  })

  it('persists soccer sport with STANDARD variant for soccer creation defaults', async () => {
    const { POST } = await import('@/app/api/league/create/route')

    leagueCreateMock.mockResolvedValueOnce({
      id: 'league-soccer-1',
      name: 'Soccer Wizard League',
      sport: 'SOCCER',
    })

    getInitialSettingsForCreationMock.mockImplementationOnce((_sport: string, variant: string | undefined) => ({
      sport_type: 'SOCCER',
      roster_format_type: 'standard',
      scoring_format_type: 'standard',
      starter_slots: { GKP: 1, DEF: 4, MID: 4, FWD: 2 },
      bench_slots: 4,
      league_variant: variant ?? 'STANDARD',
    }))

    const req = new Request('http://localhost/api/league/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Soccer Wizard League',
        platform: 'manual',
        sport: 'SOCCER',
        leagueType: 'redraft',
        leagueVariant: 'STANDARD',
        leagueSize: 12,
        isDynasty: false,
        settings: {},
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const createData = leagueCreateMock.mock.calls.at(-1)?.[0]?.data
    expect(createData.sport).toBe('SOCCER')
    expect(createData.leagueVariant).toBe('STANDARD')
    expect(runPostCreateInitializationMock).toHaveBeenCalledWith('league-soccer-1', 'SOCCER', 'STANDARD')
  })

  it('rejects Soccer when an NFL-only IDP preset is requested', async () => {
    const { POST } = await import('@/app/api/league/create/route')

    const req = new Request('http://localhost/api/league/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid Soccer IDP League',
        platform: 'manual',
        sport: 'SOCCER',
        leagueVariant: 'IDP',
        leagueSize: 12,
      }),
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toContain('IDP leagues are only supported for NFL')
    expect(leagueCreateMock).toHaveBeenCalledTimes(0)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.fn()
const leagueFindFirstMock = vi.fn()
const leagueCreateMock = vi.fn()
const getInitialSettingsForCreationMock = vi.fn()
const validateLeagueSettingsMock = vi.fn()
const validateLeagueFeatureFlagsMock = vi.fn()
const runPostCreateInitializationMock = vi.fn()

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

describe('POST /api/league/create sport defaults integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    leagueFindFirstMock.mockResolvedValue(null)
    leagueCreateMock.mockImplementation(async ({ data }: any) => ({
      id: `league-${String(data.sport).toLowerCase()}`,
      name: data.name,
      sport: data.sport,
    }))

    getInitialSettingsForCreationMock.mockImplementation((sport: string) => ({
      sport_type: sport,
      default_team_count: sport === 'MLB' ? 12 : 10,
      regular_season_length:
        sport === 'NFL'
          ? 18
          : sport === 'NBA'
            ? 24
            : sport === 'MLB'
              ? 26
              : sport === 'NHL'
                ? 25
                : sport === 'NCAAF'
                  ? 15
                  : 18,
      playoff_team_count: 6,
      playoff_structure: { bracket_type: 'single_elimination' },
      matchup_frequency: 'weekly',
      season_labeling: 'week',
      scoring_mode: 'points',
      roster_mode: 'redraft',
      waiver_mode: 'faab',
      trade_review_mode: 'commissioner',
      standings_tiebreakers: ['points_for', 'head_to_head'],
      schedule_unit: 'week',
      injury_slot_behavior: sport === 'MLB' ? 'ir_only' : 'ir_or_out',
      lock_time_behavior: sport === 'MLB' ? 'slate_lock' : 'first_game',
    }))

    validateLeagueSettingsMock.mockReturnValue({ valid: true, errors: [] })
    validateLeagueFeatureFlagsMock.mockResolvedValue({ valid: true, disallowed: [] })
    runPostCreateInitializationMock.mockResolvedValue({ ok: true })
  })

  it('persists sport-specific initial settings for required sports', async () => {
    const { POST } = await import('@/app/api/league/create/route')

    const sports = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER'] as const

    for (const sport of sports) {
      const req = new Request('http://localhost/api/league/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${sport} Test League`,
          platform: 'manual',
          sport,
          leagueSize: 12,
          scoring: 'standard',
          isDynasty: false,
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json?.league?.sport).toBe(sport)
    }

    expect(getInitialSettingsForCreationMock).toHaveBeenCalledTimes(sports.length)
    for (const sport of sports) {
      expect(getInitialSettingsForCreationMock).toHaveBeenCalledWith(
        sport,
        undefined,
        expect.objectContaining({ roster_mode: undefined })
      )
    }

    expect(leagueCreateMock).toHaveBeenCalledTimes(sports.length)
    const createPayloads = leagueCreateMock.mock.calls.map((c) => c[0]?.data)
    for (const payload of createPayloads) {
      expect(payload.settings).toEqual(
        expect.objectContaining({
          sport_type: payload.sport,
          playoff_team_count: 6,
          matchup_frequency: 'weekly',
          schedule_unit: 'week',
          trade_review_mode: 'commissioner',
          standings_tiebreakers: ['points_for', 'head_to_head'],
          draft_type: expect.any(String),
          draft_rounds: expect.any(Number),
          waiver_type: expect.any(String),
        })
      )
    }

    const mlbPayload = createPayloads.find((p) => p.sport === 'MLB')
    expect(mlbPayload?.settings).toEqual(
      expect.objectContaining({
        regular_season_length: 26,
        lock_time_behavior: 'slate_lock',
        injury_slot_behavior: 'ir_only',
      })
    )

    const nflPayload = createPayloads.find((p) => p.sport === 'NFL')
    expect(nflPayload?.settings).toEqual(
      expect.objectContaining({
        regular_season_length: 18,
        lock_time_behavior: 'first_game',
        injury_slot_behavior: 'ir_or_out',
      })
    )
  })

  it('persists NFL variant matrix and Soccer standard variant', async () => {
    const { POST } = await import('@/app/api/league/create/route')

    const cases = [
      { sport: 'NFL', variant: 'STANDARD' },
      { sport: 'NFL', variant: 'PPR' },
      { sport: 'NFL', variant: 'SUPERFLEX' },
      { sport: 'NFL', variant: 'IDP' },
      { sport: 'NFL', variant: 'DYNASTY_IDP' },
      { sport: 'SOCCER', variant: 'STANDARD' },
    ] as const

    for (const c of cases) {
      const req = new Request('http://localhost/api/league/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${c.sport} ${c.variant} League`,
          platform: 'manual',
          sport: c.sport,
          leagueVariant: c.variant,
          leagueSize: 12,
          scoring: 'standard',
          isDynasty: c.variant === 'DYNASTY_IDP',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
    }

    const recentPayloads = leagueCreateMock.mock.calls.slice(-cases.length).map((c) => c[0]?.data)
    expect(recentPayloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sport: 'NFL', leagueVariant: 'STANDARD' }),
        expect.objectContaining({ sport: 'NFL', leagueVariant: 'PPR' }),
        expect.objectContaining({ sport: 'NFL', leagueVariant: 'SUPERFLEX' }),
        expect.objectContaining({ sport: 'NFL', leagueVariant: 'IDP' }),
        expect.objectContaining({ sport: 'NFL', leagueVariant: 'DYNASTY_IDP' }),
        expect.objectContaining({ sport: 'SOCCER', leagueVariant: 'STANDARD' }),
      ])
    )
  })
})

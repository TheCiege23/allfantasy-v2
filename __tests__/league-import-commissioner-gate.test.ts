import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  yahooFetchMock,
  espnFetchMock,
} = vi.hoisted(() => ({
  yahooFetchMock: vi.fn(),
  espnFetchMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    userProfile: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/league-import/yahoo/YahooLeagueFetchService', () => ({
  fetchYahooLeagueForImport: yahooFetchMock,
}))

vi.mock('@/lib/league-import/espn/EspnLeagueFetchService', () => ({
  fetchEspnLeagueForImport: espnFetchMock,
}))

describe('assertImportCommissioner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows Yahoo import when the linked viewer team is commissioner-flagged', async () => {
    yahooFetchMock.mockResolvedValue({
      viewerTeamKey: '401.l.1.t.4',
      commissionerTeamKeys: ['401.l.1.t.4'],
      teams: [
        {
          teamKey: '401.l.1.t.4',
          managerGuid: 'guid-1',
          managerId: 'guid-1',
        },
      ],
    })

    const { assertImportCommissioner } = await import('@/lib/league-import/commissionerGate')
    await expect(
      assertImportCommissioner({
        appUserId: 'u1',
        provider: 'yahoo',
        sourceLeagueId: '401.l.1',
      })
    ).resolves.toEqual({
      ok: true,
      sourceManagerId: 'guid-1',
      verification: 'api',
    })
  })

  it('allows Yahoo import when the viewer is a league member', async () => {
    yahooFetchMock.mockResolvedValue({
      viewerTeamKey: '401.l.1.t.7',
      commissionerTeamKeys: ['401.l.1.t.4'],
      teams: [
        {
          teamKey: '401.l.1.t.7',
          managerGuid: 'guid-7',
          managerId: 'guid-7',
        },
      ],
    })

    const { assertImportCommissioner } = await import('@/lib/league-import/commissionerGate')
    const result = await assertImportCommissioner({
      appUserId: 'u1',
      provider: 'yahoo',
      sourceLeagueId: '401.l.1',
    })

    expect(result.ok).toBe(true)
    expect(result.sourceManagerId).toBe('guid-7')
    expect(result.verification).toBe('api')
  })

  it('allows ESPN import when the viewer team belongs to a commissioner member', async () => {
    espnFetchMock.mockResolvedValue({
      viewerTeamId: '3',
      commissionerTeamIds: ['3'],
      teams: [
        {
          teamId: '3',
          managerId: 'espn-member-3',
        },
      ],
    })

    const { assertImportCommissioner } = await import('@/lib/league-import/commissionerGate')
    await expect(
      assertImportCommissioner({
        appUserId: 'u1',
        provider: 'espn',
        sourceLeagueId: '12345',
      })
    ).resolves.toEqual({
      ok: true,
      sourceManagerId: 'espn-member-3',
      verification: 'api',
    })
  })

  it('allows fantrax imports for authenticated users (open-read provider)', async () => {
    const { assertImportCommissioner } = await import('@/lib/league-import/commissionerGate')
    const result = await assertImportCommissioner({
      appUserId: 'u1',
      provider: 'fantrax',
      sourceLeagueId: 'fantrax-1',
    })

    expect(result).toEqual({ ok: true, verification: 'api' })
  })
})

describe('assertImportCommissioner — Sleeper commissioner gate (Phase 2.2)', () => {
  const SLEEPER_UID = '591462610482806784'
  const LEAGUE_ID = '1204903552921649152'

  async function setup(users: unknown) {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.userProfile.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      sleeperUserId: SLEEPER_UID,
      sleeperUsername: 'theciege24',
    })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => users,
    }) as unknown as typeof fetch
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows full import when the requester is the Sleeper commissioner (is_owner)', async () => {
    await setup([{ user_id: SLEEPER_UID, is_owner: true }])
    const { assertImportCommissioner } = await import('@/lib/league-import/commissionerGate')
    const result = await assertImportCommissioner({
      appUserId: 'u1',
      provider: 'sleeper',
      sourceLeagueId: LEAGUE_ID,
      requireCommissioner: true,
    })
    expect(result.ok).toBe(true)
    expect(result.isCommissioner).toBe(true)
  })

  it('blocks full import when the requester is a normal manager (not owner)', async () => {
    await setup([{ user_id: SLEEPER_UID, is_owner: false }])
    const { assertImportCommissioner } = await import('@/lib/league-import/commissionerGate')
    const result = await assertImportCommissioner({
      appUserId: 'u1',
      provider: 'sleeper',
      sourceLeagueId: LEAGUE_ID,
      requireCommissioner: true,
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('Only the Sleeper commissioner can import this league into AllFantasy.')
  })

  it('still allows a normal manager for membership/legacy imports (no requireCommissioner)', async () => {
    await setup([{ user_id: SLEEPER_UID, is_owner: false }])
    const { assertImportCommissioner } = await import('@/lib/league-import/commissionerGate')
    const result = await assertImportCommissioner({
      appUserId: 'u1',
      provider: 'sleeper',
      sourceLeagueId: LEAGUE_ID,
    })
    expect(result.ok).toBe(true)
    expect(result.isCommissioner).toBe(false)
  })

  it('fails closed on missing/ambiguous commissioner metadata (member, no owner flag)', async () => {
    // metadata.is_commissioner is null on real Sleeper leagues — must not pass as commissioner.
    await setup([{ user_id: SLEEPER_UID, is_owner: false, metadata: {} }])
    const { assertImportCommissioner } = await import('@/lib/league-import/commissionerGate')
    const result = await assertImportCommissioner({
      appUserId: 'u1',
      provider: 'sleeper',
      sourceLeagueId: LEAGUE_ID,
      requireCommissioner: true,
    })
    expect(result.ok).toBe(false)
  })

  it('honors metadata.is_commissioner="true" as a secondary commissioner signal', async () => {
    await setup([{ user_id: SLEEPER_UID, is_owner: false, metadata: { is_commissioner: 'true' } }])
    const { assertImportCommissioner } = await import('@/lib/league-import/commissionerGate')
    const result = await assertImportCommissioner({
      appUserId: 'u1',
      provider: 'sleeper',
      sourceLeagueId: LEAGUE_ID,
      requireCommissioner: true,
    })
    expect(result.ok).toBe(true)
    expect(result.isCommissioner).toBe(true)
  })
})
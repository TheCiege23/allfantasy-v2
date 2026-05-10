import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.fn()
const assertCommissionerMock = vi.fn()
const isAdminRoleMock = vi.fn()
const isAdminEmailAllowedMock = vi.fn()
const getLeagueRoleMock = vi.fn()

const leagueFindUniqueMock = vi.fn()
const leagueUpdateMock = vi.fn()
const leagueInviteUpsertMock = vi.fn()
const redraftLeagueExtendedSettingsFindUniqueMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/commissioner/permissions', () => ({
  assertCommissioner: assertCommissionerMock,
}))

vi.mock('@/lib/adminAuth', () => ({
  isAdminRole: isAdminRoleMock,
  isAdminEmailAllowed: isAdminEmailAllowedMock,
}))

vi.mock('@/lib/league/permissions', () => ({
  getLeagueRole: getLeagueRoleMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    league: {
      findUnique: leagueFindUniqueMock,
      update: leagueUpdateMock,
    },
    leagueInvite: {
      upsert: leagueInviteUpsertMock,
    },
    redraftLeagueExtendedSettings: {
      findUnique: redraftLeagueExtendedSettingsFindUniqueMock,
    },
  },
}))

describe('/api/commissioner/leagues/[leagueId]/invite route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'u-commissioner', role: 'commissioner', email: 'comm@test.dev' } })
    assertCommissionerMock.mockResolvedValue(undefined)
    isAdminRoleMock.mockReturnValue(false)
    isAdminEmailAllowedMock.mockReturnValue(false)
    getLeagueRoleMock.mockResolvedValue('commissioner')
    redraftLeagueExtendedSettingsFindUniqueMock.mockResolvedValue({ allowMemberInviteRankBypass: false })
  })

  it('commissioner can create bypass invite', async () => {
    leagueFindUniqueMock.mockResolvedValueOnce({ settings: { inviteCode: 'SPECIAL01' } })

    leagueUpdateMock.mockResolvedValue({
      id: 'league-1',
      settings: {
        inviteCode: 'SPECIAL01',
        inviteLink: 'https://allfantasy.ai/join?code=SPECIAL01',
        inviteExpiresAt: '2030-01-01T00:00:00.000Z',
      },
    })

    const { POST } = await import('@/app/api/commissioner/leagues/[leagueId]/invite/route')
    const res = await POST(
      new Request('http://localhost/api/commissioner/leagues/league-1/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypassRankGate: true, regenerate: false }),
      }) as any,
      { params: { leagueId: 'league-1' } }
    )

    expect(res.status).toBe(200)
    expect(assertCommissionerMock).not.toHaveBeenCalled()
    expect(leagueInviteUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'SPECIAL01' },
        update: expect.objectContaining({ bypassRankGate: true, createdByRole: 'COMMISSIONER' }),
        create: expect.objectContaining({ bypassRankGate: true, createdByRole: 'COMMISSIONER' }),
      })
    )
    const body = await res.json()
    expect(body.bypassRankGate).toBe(true)
  })

  it('non-commissioner cannot create bypass invite', async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'u-member', role: 'member', email: 'member@test.dev' } })
    getLeagueRoleMock.mockResolvedValueOnce('member')
    redraftLeagueExtendedSettingsFindUniqueMock.mockResolvedValueOnce({ allowMemberInviteRankBypass: false })

    const { POST } = await import('@/app/api/commissioner/leagues/[leagueId]/invite/route')
    const res = await POST(
      new Request('http://localhost/api/commissioner/leagues/league-1/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypassRankGate: true }),
      }) as any,
      { params: { leagueId: 'league-1' } }
    )

    expect(res.status).toBe(403)
    expect(leagueInviteUpsertMock).not.toHaveBeenCalled()
  })

  it('member can create bypass invite when allowMemberInviteRankBypass is enabled', async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'u-member', role: 'member', email: 'member@test.dev' } })
    getLeagueRoleMock.mockResolvedValueOnce('member')
    redraftLeagueExtendedSettingsFindUniqueMock.mockResolvedValueOnce({ allowMemberInviteRankBypass: true })
    leagueFindUniqueMock.mockResolvedValueOnce({ settings: { inviteCode: 'MEMBER01' } })

    leagueUpdateMock.mockResolvedValue({
      id: 'league-1',
      settings: {
        inviteCode: 'MEMBER01',
        inviteLink: 'https://allfantasy.ai/join?code=MEMBER01',
        inviteExpiresAt: '2030-01-01T00:00:00.000Z',
      },
    })

    const { POST } = await import('@/app/api/commissioner/leagues/[leagueId]/invite/route')
    const res = await POST(
      new Request('http://localhost/api/commissioner/leagues/league-1/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypassRankGate: true, regenerate: false }),
      }) as any,
      { params: { leagueId: 'league-1' } }
    )

    expect(res.status).toBe(200)
    expect(assertCommissionerMock).not.toHaveBeenCalled()
    expect(leagueInviteUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'MEMBER01' },
        update: expect.objectContaining({ bypassRankGate: true }),
        create: expect.objectContaining({ bypassRankGate: true }),
      })
    )
  })

  it('normal invite remains bypassRankGate false', async () => {
    leagueFindUniqueMock.mockResolvedValueOnce({ settings: { inviteCode: 'NORMAL01' } })

    leagueUpdateMock.mockResolvedValue({
      id: 'league-1',
      settings: {
        inviteCode: 'NORMAL01',
        inviteLink: 'https://allfantasy.ai/join?code=NORMAL01',
        inviteExpiresAt: '2030-01-01T00:00:00.000Z',
      },
    })

    const { POST } = await import('@/app/api/commissioner/leagues/[leagueId]/invite/route')
    const res = await POST(
      new Request('http://localhost/api/commissioner/leagues/league-1/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: false }),
      }) as any,
      { params: { leagueId: 'league-1' } }
    )

    expect(res.status).toBe(200)
    expect(assertCommissionerMock).toHaveBeenCalledWith('league-1', 'u-commissioner')
    expect(leagueInviteUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'NORMAL01' },
        update: expect.objectContaining({ bypassRankGate: false }),
        create: expect.objectContaining({ bypassRankGate: false }),
      })
    )
    const body = await res.json()
    expect(body.bypassRankGate).toBe(false)
  })
})

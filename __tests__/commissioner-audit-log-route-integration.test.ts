import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockNextRequest } from '@/__tests__/helpers/createMockNextRequest'

const hm = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  assertLeagueActionGate: vi.fn(),
  draftPickAuditLogFindMany: vi.fn(),
}))

vi.mock('next-auth', () => ({ getServerSession: hm.getServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

vi.mock('@/server/services/leagueActionGate', () => ({
  assertLeagueActionGate: hm.assertLeagueActionGate,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    draftPickAuditLog: {
      findMany: hm.draftPickAuditLogFindMany,
    },
  },
}))

function sampleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row-1',
    action: 'ASSIGN_PLAYER_TO_PICK',
    overallPickNumber: 1,
    round: 1,
    actorUserId: 'user-1',
    oldRosterId: null,
    newRosterId: 'roster-1',
    oldPlayerId: null,
    oldPlayerName: null,
    newPlayerId: 'pid-A',
    newPlayerName: 'Saquon Barkley',
    reason: null,
    metadata: {},
    createdAt: new Date('2026-04-24T12:00:00Z'),
    ...overrides,
  }
}

async function call(url: string) {
  const { GET } = await import(
    '@/app/api/leagues/[leagueId]/draft/commissioner/audit-log/route'
  )
  const req = createMockNextRequest(url, { method: 'GET' })
  return GET(req as any, { params: Promise.resolve({ leagueId: 'league-1' }) })
}

beforeEach(() => {
  vi.clearAllMocks()
  hm.getServerSession.mockResolvedValue({ user: { id: 'commish-1' } })
  hm.assertLeagueActionGate.mockResolvedValue({ ok: true })
  hm.draftPickAuditLogFindMany.mockResolvedValue([sampleRow()])
})

describe('GET /api/leagues/[leagueId]/draft/commissioner/audit-log', () => {
  it('returns 401 when unauthenticated', async () => {
    hm.getServerSession.mockResolvedValue(null)
    const res = await call('http://localhost/api/leagues/league-1/draft/commissioner/audit-log')
    expect(res.status).toBe(401)
  })

  it('returns 403 when not commissioner', async () => {
    hm.assertLeagueActionGate.mockResolvedValue({
      ok: false,
      err: { status: 403, error: 'Forbidden', code: 'FORBIDDEN' },
    })
    const res = await call('http://localhost/api/leagues/league-1/draft/commissioner/audit-log')
    expect(res.status).toBe(403)
  })

  it('returns items list with ISO-serialized dates', async () => {
    const res = await call('http://localhost/api/leagues/league-1/draft/commissioner/audit-log')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].createdAt).toBe('2026-04-24T12:00:00.000Z')
    expect(body.nextCursor).toBeNull()
    expect(hm.draftPickAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { leagueId: 'league-1' },
        orderBy: { createdAt: 'desc' },
        take: 26, // limit=25 + peek
      }),
    )
  })

  it('clamps limit to [1, 100]', async () => {
    await call('http://localhost/api/leagues/league-1/draft/commissioner/audit-log?limit=500')
    expect(hm.draftPickAuditLogFindMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 101 }),
    )
    await call('http://localhost/api/leagues/league-1/draft/commissioner/audit-log?limit=0')
    expect(hm.draftPickAuditLogFindMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 2 }),
    )
  })

  it('filters by valid action and ignores unknown action', async () => {
    await call(
      'http://localhost/api/leagues/league-1/draft/commissioner/audit-log?action=REMOVE_PLAYER_FROM_PICK',
    )
    expect(hm.draftPickAuditLogFindMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { leagueId: 'league-1', action: 'REMOVE_PLAYER_FROM_PICK' },
      }),
    )
    await call(
      'http://localhost/api/leagues/league-1/draft/commissioner/audit-log?action=NUKE_IT',
    )
    expect(hm.draftPickAuditLogFindMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { leagueId: 'league-1' },
      }),
    )
  })

  it('adds cursor + skip when cursor provided', async () => {
    await call(
      'http://localhost/api/leagues/league-1/draft/commissioner/audit-log?cursor=abc123',
    )
    expect(hm.draftPickAuditLogFindMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cursor: { id: 'abc123' },
        skip: 1,
      }),
    )
  })

  it('applies since + until date filters', async () => {
    await call(
      'http://localhost/api/leagues/league-1/draft/commissioner/audit-log?since=2026-04-01T00:00:00Z&until=2026-05-01T00:00:00Z',
    )
    const call0 = hm.draftPickAuditLogFindMany.mock.calls[0][0]
    expect(call0.where.createdAt).toEqual({
      gte: new Date('2026-04-01T00:00:00Z'),
      lt: new Date('2026-05-01T00:00:00Z'),
    })
  })

  it('sets nextCursor when result exceeds limit', async () => {
    const rows = Array.from({ length: 26 }, (_, i) =>
      sampleRow({ id: `row-${i}`, createdAt: new Date('2026-04-24T12:00:00Z') }),
    )
    hm.draftPickAuditLogFindMany.mockResolvedValue(rows)
    const res = await call('http://localhost/api/leagues/league-1/draft/commissioner/audit-log?limit=25')
    const body = await res.json()
    expect(body.items).toHaveLength(25)
    expect(body.nextCursor).toBe('row-24') // 25th item's id (index 24)
  })

  it('returns 500 on unexpected error', async () => {
    hm.draftPickAuditLogFindMany.mockRejectedValue(new Error('boom'))
    const res = await call('http://localhost/api/leagues/league-1/draft/commissioner/audit-log')
    expect(res.status).toBe(500)
  })
})

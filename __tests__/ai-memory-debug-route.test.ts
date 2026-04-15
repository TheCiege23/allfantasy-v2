import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.fn()
const getUnifiedMemoryRecordsMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/ai-memory/unified-memory-system', () => ({
  getUnifiedMemoryRecords: getUnifiedMemoryRecordsMock,
}))

describe('/api/ai/memory/debug route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('returns 401 when unauthenticated', async () => {
    getServerSessionMock.mockResolvedValueOnce(null)

    const { GET } = await import('../app/api/ai/memory/debug/route')
    const request = {
      nextUrl: new URL('http://localhost/api/ai/memory/debug'),
    } as any

    const response = await GET(request)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 for invalid query parameters', async () => {
    const { GET } = await import('../app/api/ai/memory/debug/route')
    const request = {
      nextUrl: new URL('http://localhost/api/ai/memory/debug?limit=0&includePlatform=maybe'),
    } as any

    const response = await GET(request)

    expect(response.status).toBe(400)
    const payload = await response.json()
    expect(payload.error).toBe('Invalid query parameters.')
    expect(payload.details).toBeTruthy()
  })

  it('returns trimmed records without metadata by default', async () => {
    getUnifiedMemoryRecordsMock.mockResolvedValue([
      {
        scope: 'personal',
        category: 'strategy_preference',
        content: 'Prefers upside',
        confidence: 0.8,
        source: 'chat',
        sport: 'NFL',
        teamId: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
        metadata: { hidden: true },
      },
      {
        scope: 'league',
        category: 'interaction_pattern',
        content: 'Checks lineups nightly',
        confidence: 0.7,
        source: 'dashboard',
        sport: 'NFL',
        teamId: null,
        updatedAt: '2026-01-02T00:00:00.000Z',
        metadata: { hidden: true },
      },
    ])

    const { GET } = await import('../app/api/ai/memory/debug/route')
    const request = {
      nextUrl: new URL('http://localhost/api/ai/memory/debug?role=member&limit=1&includePlatform=false'),
    } as any

    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(getUnifiedMemoryRecordsMock).toHaveBeenCalledWith({
      userId: 'user-1',
      role: 'member',
      leagueId: null,
      teamId: null,
      includePlatform: false,
    })

    const payload = await response.json()
    expect(payload.ok).toBe(true)
    expect(payload.count).toBe(1)
    expect(payload.records).toHaveLength(1)
    expect(payload.records[0]).not.toHaveProperty('metadata')
  })

  it('includes metadata when requested', async () => {
    getUnifiedMemoryRecordsMock.mockResolvedValue([
      {
        scope: 'team',
        category: 'action_outcome',
        content: 'Accepted lineup recommendation',
        confidence: 0.9,
        source: 'actions',
        sport: 'NFL',
        teamId: 'team-1',
        updatedAt: '2026-01-03T00:00:00.000Z',
        metadata: { actionId: 'a-1' },
      },
    ])

    const { GET } = await import('../app/api/ai/memory/debug/route')
    const request = {
      nextUrl: new URL('http://localhost/api/ai/memory/debug?includeMetadata=true&role=commissioner'),
    } as any

    const response = await GET(request)

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.records[0].metadata).toEqual({ actionId: 'a-1' })
  })

  it('uses member role and limit=25 defaults when query params are omitted', async () => {
    const records = Array.from({ length: 30 }, (_, idx) => ({
      scope: 'personal',
      category: 'chat_context',
      content: `Memory ${idx + 1}`,
      confidence: 0.6,
      source: 'chat',
      sport: 'NFL',
      teamId: null,
      updatedAt: '2026-01-06T00:00:00.000Z',
      metadata: { index: idx + 1 },
    }))
    getUnifiedMemoryRecordsMock.mockResolvedValue(records)

    const { GET } = await import('../app/api/ai/memory/debug/route')
    const request = {
      nextUrl: new URL('http://localhost/api/ai/memory/debug'),
    } as any

    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(getUnifiedMemoryRecordsMock).toHaveBeenCalledWith({
      userId: 'user-1',
      role: 'member',
      leagueId: null,
      teamId: null,
      includePlatform: true,
    })

    const payload = await response.json()
    expect(payload.ok).toBe(true)
    expect(payload.count).toBe(25)
    expect(payload.records).toHaveLength(25)
    expect(payload.records[0]).not.toHaveProperty('metadata')
  })
})

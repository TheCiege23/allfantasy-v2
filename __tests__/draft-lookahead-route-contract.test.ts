import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"
const getServerSessionMock = vi.fn()
const canAccessLeagueDraftMock = vi.fn()
const publishDraftIntelStateMock = vi.fn()
const sendDraftIntelDmMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/live-draft-engine/auth', () => ({
  canAccessLeagueDraft: canAccessLeagueDraftMock,
}))

vi.mock('@/lib/draft-intelligence', () => ({
  publishDraftIntelState: publishDraftIntelStateMock,
  sendDraftIntelDm: sendDraftIntelDmMock,
}))

describe('POST /api/draft/lookahead contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const { POST } = await import('@/app/api/draft/lookahead/route')
    const req = createMockNextRequest('http://localhost/api/draft/lookahead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: 'league-1' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('returns 403 when league access is denied', async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'user-1' } })
    canAccessLeagueDraftMock.mockResolvedValueOnce(false)
    const { POST } = await import('@/app/api/draft/lookahead/route')
    const req = createMockNextRequest('http://localhost/api/draft/lookahead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: 'league-1' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(403)
  })

  it('returns state and DM metadata on success', async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'user-1' } })
    canAccessLeagueDraftMock.mockResolvedValueOnce(true)
    publishDraftIntelStateMock.mockResolvedValueOnce({
      leagueId: 'league-1',
      userId: 'user-1',
      rosterId: 'roster-1',
      status: 'active',
      queue: [{ rank: 1, playerName: 'Player One', position: 'RB', team: 'DAL', availabilityProbability: 72 }],
    })
    sendDraftIntelDmMock.mockResolvedValueOnce({ threadId: 'thread-1', sent: true })

    const { POST } = await import('@/app/api/draft/lookahead/route')
    const req = createMockNextRequest('http://localhost/api/draft/lookahead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: 'league-1', trigger: 'n_minus_5' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.state.rosterId).toBe('roster-1')
    expect(body.dm.threadId).toBe('thread-1')
    expect(publishDraftIntelStateMock).toHaveBeenCalledWith({
      leagueId: 'league-1',
      userId: 'user-1',
      trigger: 'n_minus_5',
    })
  })
})

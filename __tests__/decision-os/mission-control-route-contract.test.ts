/**
 * Commissioner OS Surface Alignment — Phase B Increment 5.
 *
 * Contract test for `/api/decision-os/mission-control`: mirrors the existing
 * `/api/decision-os/manager-intelligence` route's contract exactly (session-gated 401,
 * `leagueId` required 400, otherwise call the composition and return it as-is). No DB, no
 * network — `resolveMissionControlSnapshot` is mocked; this file only proves the route's own
 * dispatch contract.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getServerSessionMock, resolveMissionControlSnapshotMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  resolveMissionControlSnapshotMock: vi.fn(),
}))

vi.mock('next-auth', () => ({ getServerSession: getServerSessionMock }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/decision-os/missionControl', () => ({
  resolveMissionControlSnapshot: resolveMissionControlSnapshotMock,
}))

import { GET } from '@/app/api/decision-os/mission-control/route'

function req(url: string) {
  return new Request(url) as unknown as Parameters<typeof GET>[0]
}

describe('/api/decision-os/mission-control route contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
  })

  it('requires a session (401)', async () => {
    getServerSessionMock.mockResolvedValue(null)
    const res = await GET(req('http://localhost/api/decision-os/mission-control?leagueId=L1'))
    expect(res.status).toBe(401)
    expect(resolveMissionControlSnapshotMock).not.toHaveBeenCalled()
  })

  it('requires leagueId (400)', async () => {
    const res = await GET(req('http://localhost/api/decision-os/mission-control'))
    expect(res.status).toBe(400)
    expect(resolveMissionControlSnapshotMock).not.toHaveBeenCalled()
  })

  it('calls the composition with the given leagueId and returns its snapshot as-is', async () => {
    const fakeSnapshot = { leagueId: 'L1', leagueHealth: { available: true }, recommendedActions: [] }
    resolveMissionControlSnapshotMock.mockResolvedValue(fakeSnapshot)

    const res = await GET(req('http://localhost/api/decision-os/mission-control?leagueId=L1'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(fakeSnapshot)
    expect(resolveMissionControlSnapshotMock).toHaveBeenCalledWith('L1')
  })
})

/**
 * Fantasy OS Suite — Phase D Increment 5.
 *
 * Contract test for `/api/decision-os/user-os`: mirrors the existing
 * `/api/decision-os/manager-intelligence` route's contract exactly (session-gated 401, `leagueId`
 * required 400, otherwise call the composition with the SESSION user's own id and return the
 * snapshot as-is). No DB, no network — `resolveUserOsSnapshot` is mocked; this file only proves the
 * route's dispatch contract.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getServerSessionMock, resolveUserOsSnapshotMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  resolveUserOsSnapshotMock: vi.fn(),
}))

vi.mock('next-auth', () => ({ getServerSession: getServerSessionMock }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/decision-os/userOs', () => ({
  resolveUserOsSnapshot: resolveUserOsSnapshotMock,
}))

import { GET } from '@/app/api/decision-os/user-os/route'

function req(url: string) {
  return new Request(url) as unknown as Parameters<typeof GET>[0]
}

describe('/api/decision-os/user-os route contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
  })

  it('requires a session (401)', async () => {
    getServerSessionMock.mockResolvedValue(null)
    const res = await GET(req('http://localhost/api/decision-os/user-os?leagueId=L1'))
    expect(res.status).toBe(401)
    expect(resolveUserOsSnapshotMock).not.toHaveBeenCalled()
  })

  it('requires leagueId (400)', async () => {
    const res = await GET(req('http://localhost/api/decision-os/user-os'))
    expect(res.status).toBe(400)
    expect(resolveUserOsSnapshotMock).not.toHaveBeenCalled()
  })

  it('calls the composition with the leagueId and the SESSION user id (never a URL param), returns the snapshot as-is', async () => {
    const fakeSnapshot = { leagueId: 'L1', managerId: 'u1', available: true }
    resolveUserOsSnapshotMock.mockResolvedValue(fakeSnapshot)

    const res = await GET(req('http://localhost/api/decision-os/user-os?leagueId=L1&managerId=someone-else'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(fakeSnapshot)
    expect(resolveUserOsSnapshotMock).toHaveBeenCalledWith('L1', 'u1')
  })
})

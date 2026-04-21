import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextRequest } from '@/__tests__/helpers/createMockNextRequest'

const getServerSessionMock = vi.fn()
const getChimmyLearningSnapshotServerMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/chimmy-actions/server-store', () => ({
  getChimmyLearningSnapshotServer: getChimmyLearningSnapshotServerMock,
}))

describe('GET /api/ai/actions/analytics/summary contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } })
    getChimmyLearningSnapshotServerMock.mockResolvedValue({
      totals: {
        shown: 10,
        clicked: 6,
        confirmed: 3,
        completed: 4,
        dismissed: 2,
        saved: 1,
        failed: 1,
        followedSuggestion: 3,
        measurableOutcomes: 1,
      },
      actionMetrics: [],
      surfaceMetrics: [],
      recommendationStylePreferences: [],
      notes: [],
    })
  })

  it('returns 401 when unauthenticated', async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const { GET } = await import('@/app/api/ai/actions/analytics/summary/route')
    const req = createMockNextRequest('http://localhost/api/ai/actions/analytics/summary')

    const res = await GET(req as any)
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('returns analytics snapshot for authenticated user', async () => {
    const { GET } = await import('@/app/api/ai/actions/analytics/summary/route')
    const req = createMockNextRequest(
      'http://localhost/api/ai/actions/analytics/summary?limit=250&includeSavedRecommendations=true',
    )

    const res = await GET(req as any)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      snapshot: {
        totals: {
          shown: 10,
          completed: 4,
        },
      },
    })

    expect(getChimmyLearningSnapshotServerMock).toHaveBeenCalledWith('user-1', {
      limit: 250,
      includeSavedRecommendations: true,
    })
  })
})

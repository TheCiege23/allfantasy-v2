import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireVerifiedUserMock = vi.fn()
const getSleeperImportPreviewMock = vi.fn()

vi.mock('@/lib/auth-guard', () => ({
  requireVerifiedUser: requireVerifiedUserMock,
}))

vi.mock('@/lib/league-import/sleeper/SleeperImportPreviewService', () => ({
  getSleeperImportPreview: getSleeperImportPreviewMock,
}))

describe('POST /api/leagues/import/preview Sleeper service path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireVerifiedUserMock.mockResolvedValue({
      ok: true,
      userId: 'u1',
    })
  })

  it('returns sleeper preview payload from SleeperImportPreviewService', async () => {
    getSleeperImportPreviewMock.mockResolvedValue({
      success: true,
      preview: {
        league: { id: '12345', name: 'Sleeper Preview League' },
      },
    })

    const { POST } = await import('@/app/api/leagues/import/preview/route')
    const req = new Request('http://localhost/api/leagues/import/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'sleeper',
        sourceId: '12345',
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      league: { id: '12345', name: 'Sleeper Preview League' },
    })
    expect(getSleeperImportPreviewMock).toHaveBeenCalledWith({
      sourceId: '12345',
      userId: 'u1',
    })
  })

  it('maps sleeper preview errors to status codes', async () => {
    getSleeperImportPreviewMock.mockResolvedValue({
      success: false,
      error: 'League not found.',
      code: 'LEAGUE_NOT_FOUND',
    })

    const { POST } = await import('@/app/api/leagues/import/preview/route')
    const req = new Request('http://localhost/api/leagues/import/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'sleeper',
        sourceId: 'missing',
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: 'League not found.' })
  })
})

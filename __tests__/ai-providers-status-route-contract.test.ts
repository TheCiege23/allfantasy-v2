import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.fn()
const isOpenClawConfiguredMock = vi.fn()
const isOpenClawGrowthConfiguredMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/openclaw/config', () => ({
  isOpenClawConfigured: isOpenClawConfiguredMock,
  isOpenClawGrowthConfigured: isOpenClawGrowthConfiguredMock,
}))

describe('GET /api/ai/providers/status contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isOpenClawConfiguredMock.mockReturnValue(true)
    isOpenClawGrowthConfiguredMock.mockReturnValue(false)
  })

  it('returns 401 when unauthenticated', async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const { GET } = await import('@/app/api/ai/providers/status/route')
    const res = await GET()
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('returns provider status with openclaw fields', async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'u-1' } })
    const { GET } = await import('@/app/api/ai/providers/status/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({
      openai: expect.any(Boolean),
      deepseek: expect.any(Boolean),
      grok: expect.any(Boolean),
      xai: expect.any(Boolean),
      openclaw: true,
      openclawGrowth: false,
    })
    expect(json.surfaces).toEqual(
      expect.objectContaining({
        providerSelector: expect.any(Boolean),
        chimmy: expect.any(Boolean),
      })
    )
    expect(json.clearsportsTools).toBeDefined()
  })
})


import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.fn()
const checkProviderAvailabilityMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/ai-orchestration', () => ({
  checkProviderAvailability: checkProviderAvailabilityMock,
}))

describe('GET /api/ai/providers contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    getServerSessionMock.mockResolvedValue(null)

    const { GET } = await import('@/app/api/ai/providers/route')
    const res = await GET()

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('returns stable provider metadata contract with sport-aware roles', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    checkProviderAvailabilityMock.mockReturnValue({
      openai: true,
      deepseek: false,
      grok: true,
    })

    const { GET } = await import('@/app/api/ai/providers/route')
    const res = await GET()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchInlineSnapshot(`
      {
        "availability": {
          "deepseek": false,
          "grok": true,
          "openai": true,
        },
        "providers": [
          {
            "available": true,
            "id": "openai",
            "name": "OpenAI",
            "role": "Sport-aware user explanations, draft/waiver advice, roster suggestions, matchup summaries",
          },
          {
            "available": false,
            "id": "deepseek",
            "name": "DeepSeek",
            "role": "Sport-aware statistical modeling, projections, and matchup scoring context",
          },
          {
            "available": true,
            "id": "grok",
            "name": "Grok",
            "role": "Sport-aware trend detection, narrative context, and storyline framing",
          },
        ],
      }
    `)
  })
})

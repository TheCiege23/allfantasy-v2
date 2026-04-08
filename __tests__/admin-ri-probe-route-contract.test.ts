import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
}))

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: requireAdminMock,
}))

describe('Admin RI probe route', () => {
  const originalToken = process.env.ROLLING_INSIGHTS_RSC_TOKEN
  const originalGraphql = process.env.ROLLING_INSIGHTS_GRAPHQL_URL
  const originalRestBase = process.env.ROLLING_INSIGHTS_REST_BASE_URL

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ROLLING_INSIGHTS_RSC_TOKEN = originalToken
    process.env.ROLLING_INSIGHTS_GRAPHQL_URL = originalGraphql
    process.env.ROLLING_INSIGHTS_REST_BASE_URL = originalRestBase
  })

  it('returns auth gate response when admin check fails', async () => {
    requireAdminMock.mockResolvedValueOnce({
      ok: false,
      res: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })

    const { GET } = await import('@/app/api/admin/ri-probe/route')
    const req = new Request('http://localhost/api/admin/ri-probe')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('returns 400 when RSC token is missing', async () => {
    requireAdminMock.mockResolvedValueOnce({ ok: true })
    process.env.ROLLING_INSIGHTS_RSC_TOKEN = ''

    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const { GET } = await import('@/app/api/admin/ri-probe/route')
    const req = new Request('http://localhost/api/admin/ri-probe')
    const res = await GET(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      error: 'ROLLING_INSIGHTS_RSC_TOKEN is not configured',
    })
    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()
  })

  it('returns probe diagnostics payload for admins', async () => {
    requireAdminMock.mockResolvedValueOnce({ ok: true })
    process.env.ROLLING_INSIGHTS_RSC_TOKEN = 'test-rsc-token'

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input)

        if (url.includes('/graphql')) {
          return new Response(
            JSON.stringify({ data: { nflRoster: [{ id: '1' }, { id: '2' }] } }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

        return new Response(JSON.stringify({ message: 'not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      })

    const { GET } = await import('@/app/api/admin/ri-probe/route')
    const req = new Request(
      'http://localhost/api/admin/ri-probe?sport=nfl&dataType=players&bases=https://example.com/api/v1&graphql=https://example.com/graphql'
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      sport: 'NFL',
      dataType: 'players',
      rest: {
        candidatesTested: expect.any(Number),
        successes: 0,
      },
      graphql: {
        ok: true,
        status: 200,
        count: 2,
        endpoint: 'https://example.com/graphql',
      },
      hints: {
        tokenConfigured: true,
      },
      generatedAt: expect.any(Number),
    })

    expect(fetchSpy).toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

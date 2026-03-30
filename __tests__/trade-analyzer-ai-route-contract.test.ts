import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.fn()
const assertLeagueMemberMock = vi.fn()
const analyzeTradeWithOptionalAIMock = vi.fn()
const requireFeatureEntitlementMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/league-access', () => ({
  assertLeagueMember: assertLeagueMemberMock,
}))

vi.mock('@/lib/trade-analyzer', () => ({
  analyzeTradeWithOptionalAI: analyzeTradeWithOptionalAIMock,
}))

vi.mock('@/lib/telemetry/usage', () => ({
  withApiUsage: () => (handler: any) => handler,
}))

vi.mock('@/lib/subscription/entitlement-middleware', () => ({
  requireFeatureEntitlement: requireFeatureEntitlementMock,
}))

describe('POST /api/trade-analyzer/ai contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireFeatureEntitlementMock.mockResolvedValue({
      ok: true,
      decision: {},
      tokenSpend: null,
      tokenPreview: null,
    })
  })

  it('returns 401 when unauthenticated', async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const { POST } = await import('@/app/api/trade-analyzer/ai/route')

    const req = new Request('http://localhost/api/trade-analyzer/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { managerName: 'A', gives: [{ name: 'A1', value: 10 }] },
        receiver: { managerName: 'B', gives: [{ name: 'B1', value: 10 }] },
      }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('returns 403 when user is not a league member', async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'user-1' } })
    assertLeagueMemberMock.mockRejectedValueOnce(new Error('Forbidden'))
    const { POST } = await import('@/app/api/trade-analyzer/ai/route')

    const req = new Request('http://localhost/api/trade-analyzer/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leagueId: 'league-1',
        sender: { managerName: 'A', gives: [{ name: 'A1', value: 10 }] },
        receiver: { managerName: 'B', gives: [{ name: 'B1', value: 10 }] },
      }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: 'Forbidden' })
  })

  it('returns deterministic value comparison with optional AI fields', async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'user-1' } })
    assertLeagueMemberMock.mockResolvedValueOnce(undefined)
    analyzeTradeWithOptionalAIMock.mockResolvedValueOnce({
      sport: 'NFL',
      deterministic: {
        valueComparison: {
          senderGivesValue: 80,
          senderReceivesValue: 75,
          senderNetValue: -5,
          receiverGivesValue: 75,
          receiverReceivesValue: 80,
          receiverNetValue: 5,
          fairnessScore: 94,
          fairnessLabel: 'balanced',
          favoredSide: 'even',
          imbalancePct: 6.3,
        },
      },
      fairnessExplanation: {
        source: 'ai',
        text: 'AI explanation text.',
      },
      counterSuggestions: {
        source: 'ai',
        suggestions: ['Add a late pick to close the gap.'],
      },
    })

    const { POST } = await import('@/app/api/trade-analyzer/ai/route')
    const req = new Request('http://localhost/api/trade-analyzer/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sport: 'NFL',
        includeAI: true,
        sender: { managerName: 'A', gives: [{ name: 'A1', value: 80 }] },
        receiver: { managerName: 'B', gives: [{ name: 'B1', value: 75 }] },
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.analysis?.deterministic?.valueComparison?.fairnessScore).toBe(94)
    expect(body.analysis?.fairnessExplanation?.source).toBe('ai')
    expect(analyzeTradeWithOptionalAIMock).toHaveBeenCalledTimes(1)
  })
})

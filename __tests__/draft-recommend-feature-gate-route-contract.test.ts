import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.fn()
const runDraftAIAssistMock = vi.fn()
const requireFeatureEntitlementMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/draft-ai-engine', () => ({
  runDraftAIAssist: runDraftAIAssistMock,
}))

vi.mock('@/lib/subscription/entitlement-middleware', () => ({
  requireFeatureEntitlement: requireFeatureEntitlementMock,
}))

describe('POST /api/draft/recommend feature gate contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    runDraftAIAssistMock.mockResolvedValue({
      recommendation: {
        recommendation: { player: { name: 'Player A', position: 'QB' }, reason: 'Best value', confidence: 82 },
        alternatives: [],
        reachWarning: null,
        valueWarning: null,
        scarcityInsight: null,
        stackInsight: null,
        correlationInsight: null,
        formatInsight: null,
        byeNote: null,
        explanation: 'Deterministic recommendation.',
        evidence: [],
        caveats: [],
        uncertainty: null,
      },
      explanation: 'AI explanation.',
      aiExplanationUsed: true,
    })
    requireFeatureEntitlementMock.mockResolvedValue({
      ok: true,
      decision: {},
      tokenSpend: null,
      tokenPreview: null,
    })
  })

  it('returns 401 when unauthenticated', async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const { POST } = await import('@/app/api/draft/recommend/route')
    const req = new Request('http://localhost/api/draft/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: [], teamRoster: [], rosterSlots: [] }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('returns token confirmation response when fallback is required', async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'user-1' } })
    requireFeatureEntitlementMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(
        JSON.stringify({
          error: 'Token spend confirmation required.',
          code: 'token_confirmation_required',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ),
    })
    const { POST } = await import('@/app/api/draft/recommend/route')
    const req = new Request('http://localhost/api/draft/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        available: [{ name: 'Player A', position: 'QB', adp: 10 }],
        teamRoster: [],
        rosterSlots: ['QB'],
        includeAIExplanation: true,
      }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(409)
    expect(runDraftAIAssistMock).not.toHaveBeenCalled()
  })

  it('returns recommendation payload when gate allows', async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'user-1' } })
    const { POST } = await import('@/app/api/draft/recommend/route')
    const req = new Request('http://localhost/api/draft/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        available: [{ name: 'Player A', position: 'QB', adp: 10 }],
        teamRoster: [],
        rosterSlots: ['QB'],
        includeAIExplanation: true,
      }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(requireFeatureEntitlementMock).toHaveBeenCalledTimes(1)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const openaiChatTextMock = vi.fn()

vi.mock('@/lib/openai-client', () => ({
  openaiChatText: openaiChatTextMock,
}))

describe('AI Explanation Layer', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { clearAICostControlStateForTests } = await import('@/lib/ai-cost-control')
    clearAICostControlStateForTests()
  })

  it('returns ai explanation when response is grounded in deterministic evidence', async () => {
    openaiChatTextMock.mockResolvedValueOnce({
      ok: true,
      text: 'Fairness remains 87/100 and favors sender by 2.0 points. Counter with a small depth add to close the gap.',
      model: 'test',
      baseUrl: 'http://test',
    })

    const { explainDeterministicOutput } = await import('@/lib/ai-explanation-layer')
    const out = await explainDeterministicOutput({
      feature: 'trade_review',
      sport: 'NFL',
      deterministicSummary: 'Fairness is 87/100. Sender net value is +2.0.',
      deterministicEvidence: ['Favored side: sender'],
    })

    expect(out.source).toBe('ai')
    expect(out.reason).toBe('ai_success')
    expect(out.text).toMatch(/87\/100/i)
  })

  it('falls back when ai introduces numbers not in deterministic context', async () => {
    openaiChatTextMock.mockResolvedValueOnce({
      ok: true,
      text: 'Fairness is 92/100 and the edge is 4.5 points, so accept immediately.',
      model: 'test',
      baseUrl: 'http://test',
    })

    const { explainDeterministicOutput } = await import('@/lib/ai-explanation-layer')
    const out = await explainDeterministicOutput({
      feature: 'trade_review',
      sport: 'NFL',
      deterministicSummary: 'Fairness is 87/100. Sender net value is +2.0.',
      deterministicEvidence: ['Favored side: sender'],
      deterministicFallbackText: 'Deterministic fallback explanation.',
    })

    expect(out.source).toBe('deterministic')
    expect(out.reason).toBe('ai_not_grounded')
    expect(out.text).toBe('Deterministic fallback explanation.')
  })

  it('falls back when provider is unavailable', async () => {
    openaiChatTextMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      details: 'provider unavailable',
      model: 'none',
      baseUrl: '',
    })

    const { explainDeterministicOutput } = await import('@/lib/ai-explanation-layer')
    const out = await explainDeterministicOutput({
      feature: 'draft_recommendation',
      sport: 'NBA',
      deterministicSummary: 'Deterministic recommendation favors Player X.',
      deterministicFallbackText: null,
    })

    expect(out.source).toBe('deterministic')
    expect(out.reason).toBe('ai_unavailable')
    expect(out.text).toBeNull()
  })
})

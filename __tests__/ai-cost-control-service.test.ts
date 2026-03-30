import { beforeEach, describe, expect, it, vi } from 'vitest'

const openaiChatTextMock = vi.fn()

vi.mock('@/lib/openai-client', () => ({
  openaiChatText: openaiChatTextMock,
}))

describe('AICostControlService', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { clearAICostControlStateForTests } = await import('@/lib/ai-cost-control')
    clearAICostControlStateForTests()
  })

  it('returns cached response for repeated request', async () => {
    openaiChatTextMock.mockResolvedValueOnce({
      ok: true,
      text: 'Deterministic explanation from AI.',
      model: 'test',
      baseUrl: 'http://test',
    })

    const { runCostControlledOpenAIText } = await import('@/lib/ai-cost-control')
    const first = await runCostControlledOpenAIText({
      feature: 'cost-control-test',
      enableAI: true,
      fallbackText: null,
      messages: [{ role: 'user', content: 'Explain deterministic output.' }],
      cacheTtlMs: 60_000,
      repeatCooldownMs: 12_000,
    })
    const second = await runCostControlledOpenAIText({
      feature: 'cost-control-test',
      enableAI: true,
      fallbackText: null,
      messages: [{ role: 'user', content: 'Explain deterministic output.' }],
      cacheTtlMs: 60_000,
      repeatCooldownMs: 12_000,
    })

    expect(first.source).toBe('ai')
    expect(second.source).toBe('cache')
    expect(openaiChatTextMock).toHaveBeenCalledTimes(1)
  })

  it('throttles repeated failed calls inside cooldown window', async () => {
    openaiChatTextMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      details: 'provider unavailable',
      model: 'none',
      baseUrl: '',
    })

    const { runCostControlledOpenAIText } = await import('@/lib/ai-cost-control')
    const first = await runCostControlledOpenAIText({
      feature: 'cost-control-fail-cooldown',
      enableAI: true,
      fallbackText: 'deterministic fallback',
      messages: [{ role: 'user', content: 'Explain deterministic output.' }],
      repeatCooldownMs: 60_000,
    })
    const second = await runCostControlledOpenAIText({
      feature: 'cost-control-fail-cooldown',
      enableAI: true,
      fallbackText: 'deterministic fallback',
      messages: [{ role: 'user', content: 'Explain deterministic output.' }],
      repeatCooldownMs: 60_000,
    })

    expect(first.reason).toBe('ai_provider_error')
    expect(second.reason).toBe('cooldown_active')
    expect(second.source).toBe('deterministic')
    expect(openaiChatTextMock).toHaveBeenCalledTimes(1)
  })
})

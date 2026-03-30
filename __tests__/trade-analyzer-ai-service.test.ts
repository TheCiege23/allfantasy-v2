import { beforeEach, describe, expect, it, vi } from 'vitest'

const openaiChatTextMock = vi.fn()

vi.mock('@/lib/openai-client', () => ({
  openaiChatText: openaiChatTextMock,
}))

describe('TradeAnalyzerAIService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('computes deterministic value comparison and fairness score', async () => {
    const { analyzeTradeWithOptionalAI } = await import('@/lib/trade-analyzer/TradeAnalyzerAIService')

    const result = await analyzeTradeWithOptionalAI({
      sport: 'NFL',
      includeAI: false,
      sender: {
        managerName: 'Team A',
        gives: [
          { name: 'Asset A1', value: 52 },
          { name: 'Asset A2', value: 18 },
        ],
      },
      receiver: {
        managerName: 'Team B',
        gives: [
          { name: 'Asset B1', value: 50 },
          { name: 'Asset B2', value: 10 },
        ],
      },
    })

    expect(result.sport).toBe('NFL')
    expect(result.deterministic.valueComparison.senderGivesValue).toBe(70)
    expect(result.deterministic.valueComparison.senderReceivesValue).toBe(60)
    expect(result.deterministic.valueComparison.senderNetValue).toBe(-10)
    expect(result.deterministic.valueComparison.favoredSide).toBe('receiver')
    expect(result.fairnessExplanation.source).toBe('deterministic')
    expect(result.counterSuggestions.source).toBe('deterministic')
    expect(result.counterSuggestions.suggestions.length).toBeGreaterThan(0)
  })

  it('uses AI explanation and counters when enabled and valid', async () => {
    openaiChatTextMock.mockResolvedValueOnce({
      ok: true,
      text: JSON.stringify({
        fairnessExplanation: 'AI says this is close with a mild edge to Team A.',
        counterSuggestions: [
          'Ask for a depth pick add.',
          'Swap one volatile asset for a stable scorer.',
        ],
      }),
      model: 'test',
      baseUrl: 'http://test',
    })

    const { analyzeTradeWithOptionalAI } = await import('@/lib/trade-analyzer/TradeAnalyzerAIService')
    const result = await analyzeTradeWithOptionalAI({
      sport: 'NBA',
      includeAI: true,
      sender: {
        managerName: 'Sender',
        gives: [{ name: 'S1', value: 70 }],
      },
      receiver: {
        managerName: 'Receiver',
        gives: [{ name: 'R1', value: 72 }],
      },
    })

    expect(result.fairnessExplanation.source).toBe('ai')
    expect(result.fairnessExplanation.text).toMatch(/AI says/)
    expect(result.counterSuggestions.source).toBe('ai')
    expect(result.counterSuggestions.suggestions).toEqual(
      expect.arrayContaining(['Ask for a depth pick add.'])
    )
  })

  it('falls back to deterministic output when AI response is invalid', async () => {
    openaiChatTextMock.mockResolvedValueOnce({
      ok: true,
      text: 'not-json',
      model: 'test',
      baseUrl: 'http://test',
    })

    const { analyzeTradeWithOptionalAI } = await import('@/lib/trade-analyzer/TradeAnalyzerAIService')
    const result = await analyzeTradeWithOptionalAI({
      sport: 'SOCCER',
      includeAI: true,
      sender: {
        managerName: 'Sender',
        gives: [{ name: 'S1', value: 40 }],
      },
      receiver: {
        managerName: 'Receiver',
        gives: [{ name: 'R1', value: 30 }],
      },
    })

    expect(result.fairnessExplanation.source).toBe('deterministic')
    expect(result.counterSuggestions.source).toBe('deterministic')
  })
})

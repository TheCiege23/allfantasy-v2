import { describe, expect, it } from 'vitest'
import {
  buildDeterministicEnvelopeForToolRequest,
  requestContractToUnified,
} from '../request-adapter'

describe('buildDeterministicEnvelopeForToolRequest', () => {
  it('builds deterministic envelope for grounded trade tool', () => {
    const envelope = buildDeterministicEnvelopeForToolRequest({
      tool: 'trade_analyzer',
      sport: 'NFL',
      deterministicContext: {
        fairnessScore: 73,
        valueDelta: 4.8,
        sideATotalValue: 102,
        sideBTotalValue: 97,
      },
    })

    expect(envelope).toBeTruthy()
    expect(envelope?.toolId).toBe('trade_analyzer')
    expect(envelope?.sport).toBe('NFL')
    expect(envelope?.evidence?.items.length).toBeGreaterThan(0)
    expect(envelope?.confidence?.scorePct).toBeGreaterThan(0)
  })

  it('surfaces missing required deterministic fields explicitly', () => {
    const envelope = buildDeterministicEnvelopeForToolRequest({
      tool: 'trade-analyzer',
      sport: 'NBA',
      deterministicContext: {
        fairnessScore: 64,
      },
    })

    expect(envelope).toBeTruthy()
    expect(envelope?.confidence?.cappedByData).toBe(true)
    expect(envelope?.missingData?.items.length).toBeGreaterThan(0)
    expect(envelope?.uncertainty?.items.length).toBeGreaterThan(0)
  })

  it('returns null for non-grounded chimmy chat tool', () => {
    const envelope = buildDeterministicEnvelopeForToolRequest({
      tool: 'chimmy_chat',
      sport: 'NHL',
      userMessage: 'hello',
    })
    expect(envelope).toBeNull()
  })
})

describe('requestContractToUnified', () => {
  it('attaches deterministic envelope for grounded tools', () => {
    const request = requestContractToUnified(
      {
        tool: 'rankings',
        sport: 'MLB',
        deterministicContext: {
          ordering: ['A', 'B'],
          tiers: { tier1: ['A'] },
        },
      },
      'user-1'
    )

    expect(request.envelope.sport).toBe('MLB')
    expect(request.envelope.deterministicContextEnvelope?.toolId).toBe('rankings')
  })

  it('does not attach deterministic envelope for non-grounded tools', () => {
    const request = requestContractToUnified(
      {
        tool: 'chimmy_chat',
        sport: 'SOCCER',
        userMessage: 'who should I start?',
      },
      'user-2'
    )

    expect(request.envelope.deterministicContextEnvelope ?? null).toBeNull()
  })
})

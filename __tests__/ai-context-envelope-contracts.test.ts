import { describe, expect, it } from 'vitest'
import {
  buildEnvelopeFromTool,
  normalizeToContract,
  type ProviderRawOutput,
} from '@/lib/ai-context-envelope/contracts'

describe('ai-context-envelope/contracts', () => {
  it('prefers deterministic envelope evidence over provider-supplied evidence', () => {
    const envelope = buildEnvelopeFromTool('trade_analyzer', 'NFL', {
      evidence: {
        toolId: 'trade_analyzer',
        items: [
          { source: 'trade_engine', label: 'Fairness score', value: 72, unit: '%' },
          { source: 'trade_engine', label: 'Acceptance probability', value: 64, unit: '%' },
        ],
      },
    })

    const raw: ProviderRawOutput = {
      primaryAnswer: 'Take this deal.',
      evidence: [{ source: 'provider', label: 'Made up edge', value: 99, unit: '%' }],
      keyEvidence: ['Made up edge: 99%'],
    }

    const normalized = normalizeToContract(raw, envelope)

    expect(normalized.evidence).toEqual(envelope.evidence?.items)
    expect(normalized.keyEvidence).toEqual([
      'Fairness score: 72 %',
      'Acceptance probability: 64 %',
    ])
  })

  it('adds capped confidence when deterministic data is incomplete', () => {
    const envelope = buildEnvelopeFromTool('waiver_ai', 'NBA', {
      uncertainty: {
        items: [{ what: 'Role stability', impact: 'high', reason: 'Recent rotation change' }],
      },
      missingData: {
        items: [{ what: 'Updated market valuation', impact: 'high' }],
      },
    })

    const raw: ProviderRawOutput = {
      primaryAnswer: 'Add Player X as a medium-priority claim.',
    }

    const normalized = normalizeToContract(raw, envelope)

    expect(normalized.confidence).toMatchObject({
      scorePct: 45,
      label: 'low',
      cappedByData: true,
    })
    expect(normalized.confidence?.capReason).toContain('1 missing, 1 uncertain')
    expect(normalized.caveats).toEqual(
      expect.arrayContaining(['Confidence is limited: Missing/uncertain data: 1 missing, 1 uncertain.'])
    )
  })
})

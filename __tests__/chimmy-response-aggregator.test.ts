import { describe, expect, it } from 'vitest'
import { aggregateChimmyResponse } from '@/lib/chimmy-orchestration/ResponseAggregator'
import type { ChimmyDeterministicLayer } from '@/lib/chimmy-orchestration/types'

const deterministicLayer: ChimmyDeterministicLayer = {
  projections: { projectedPoints: 128.4 },
  matchupData: { opponent: 'Rivals' },
  rosterNeeds: { weakest: 'RB2' },
  adpComparisons: { valueGap: 12 },
  rankings: { rank: 4 },
  scoringOutputs: { expectedDelta: 6.1 },
  missingSections: [],
  completenessPct: 100,
}

describe('aggregateChimmyResponse', () => {
  it('returns primary model text without robotic layered labels', () => {
    const result = aggregateChimmyResponse({
      deterministicLayer,
      confidence: {
        scorePct: 78,
        label: 'high',
        reason: 'Strong deterministic context.',
        agreementPct: 82,
      },
      preferredFinalModel: 'openai',
      modelOutputs: [
        {
          model: 'openai',
          raw: 'You are in a strong spot this week; keep your current starters and monitor late injury reports.',
          skipped: false,
        },
      ],
    })

    expect(result.primaryAnswer).toContain('strong spot this week')
    expect(result.primaryAnswer).not.toContain('Deterministic layer:')
    expect(result.primaryAnswer).not.toContain('DeepSeek analysis:')
  })

  it('falls back to deterministic summary when no model output is usable', () => {
    const result = aggregateChimmyResponse({
      deterministicLayer,
      confidence: {
        scorePct: 46,
        label: 'medium',
        reason: 'Partial provider failure.',
        agreementPct: 40,
      },
      preferredFinalModel: 'openai',
      modelOutputs: [
        {
          model: 'openai',
          raw: '',
          skipped: true,
          error: 'timeout',
        },
      ],
    })

    expect(result.primaryAnswer).toContain('Based on current deterministic inputs')
    expect(result.primaryAnswer).toContain('projections:')
  })
})

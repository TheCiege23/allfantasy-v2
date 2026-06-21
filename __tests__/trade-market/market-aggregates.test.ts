import { describe, it, expect } from 'vitest'
import { computeMarketAggregates, type MarketEventInput } from '@/lib/trade-market/redraftTradeMarketAggregates'

function created(proposalId: string, opts: { grade?: string | null; fairness?: number | null; confidence?: number | null; players?: string[]; picks?: number; faab?: number; valueDelta?: number; at?: string }): MarketEventInput {
  return {
    eventType: 'proposal_created',
    tradeProposalId: proposalId,
    grade: opts.grade === undefined ? 'B' : opts.grade,
    fairnessScore: opts.fairness === undefined ? 80 : opts.fairness,
    confidenceScore: opts.confidence === undefined ? 90 : opts.confidence,
    createdAt: opts.at ?? '2026-06-21T00:00:00Z',
    payload: {
      assets: { playerAssetIds: opts.players ?? [], pickAssets: opts.picks ? Array.from({ length: opts.picks }, () => ({})) : [], faabAmount: opts.faab ?? 0 },
      snapshot: { valueDifference: opts.valueDelta ?? 100 },
    },
  }
}
const ev = (proposalId: string, eventType: string, at = '2026-06-21T01:00:00Z'): MarketEventInput => ({ eventType, tradeProposalId: proposalId, grade: null, fairnessScore: null, confidenceScore: null, payload: {}, createdAt: at })

describe('computeMarketAggregates', () => {
  it('returns empty status for no events', () => {
    const a = computeMarketAggregates([])
    expect(a.sampleStatus).toBe('empty')
    expect(a.summary.sampleSize).toBe(0)
  })

  it('marks insufficient under the minimum sample but still returns counts', () => {
    const a = computeMarketAggregates([created('p1', {}), ev('p1', 'proposal_accepted'), ev('p1', 'trade_processed')])
    expect(a.sampleStatus).toBe('insufficient')
    expect(a.summary.sampleSize).toBe(1)
    expect(a.summary.acceptedCount).toBe(1)
    expect(a.summary.processedCount).toBe(1)
  })

  it('dedupes by proposal and counts terminal outcomes once', () => {
    const events: MarketEventInput[] = [
      created('p1', { fairness: 90 }), ev('p1', 'proposal_accepted'), ev('p1', 'trade_processed'),
      created('p2', { fairness: 50 }), ev('p2', 'commissioner_vetoed'),
      created('p3', { fairness: 70 }), ev('p3', 'proposal_rejected'),
      created('p4', { fairness: 80 }), ev('p4', 'proposal_canceled'),
    ]
    const a = computeMarketAggregates(events)
    expect(a.sampleStatus).toBe('ok')
    expect(a.summary.sampleSize).toBe(4)
    expect(a.summary.acceptedCount).toBe(1)
    expect(a.summary.vetoedCount).toBe(1)
    expect(a.summary.rejectedCount).toBe(1)
    expect(a.summary.canceledCount).toBe(1)
    expect(a.summary.processedCount).toBe(1)
  })

  it('computes median + average fairness/confidence and value delta', () => {
    const a = computeMarketAggregates([
      created('p1', { fairness: 60, confidence: 80, valueDelta: 100 }),
      created('p2', { fairness: 80, confidence: 90, valueDelta: 300 }),
      created('p3', { fairness: 100, confidence: 100, valueDelta: 200 }),
    ])
    expect(a.summary.medianFairness).toBe(80)
    expect(a.summary.averageFairness).toBe(80)
    expect(a.summary.averageConfidence).toBe(90)
    expect(a.summary.averageValueDelta).toBe(200)
  })

  it('aggregates player demand + FAAB (totalFaabMoved counts accepted only)', () => {
    const a = computeMarketAggregates([
      created('p1', { players: ['x', 'y'], faab: 20 }), ev('p1', 'proposal_accepted'),
      created('p2', { players: ['x'], faab: 10 }), ev('p2', 'commissioner_vetoed'),
      created('p3', { players: ['z'], picks: 1 }), ev('p3', 'proposal_accepted'),
    ])
    expect(a.assetActivity.playerDemandCounts.x).toBe(2)
    expect(a.assetActivity.playerAcceptedCounts.x).toBe(1)
    expect(a.assetActivity.playerVetoedCounts.x).toBe(1)
    expect(a.assetActivity.faabInclusionCount).toBe(2)
    expect(a.assetActivity.totalFaabMoved).toBe(20) // only the accepted p1
    expect(a.assetActivity.draftPickInclusionCount).toBe(1)
  })

  it('builds grade + review distributions', () => {
    const a = computeMarketAggregates([
      created('p1', { grade: 'A+', fairness: 95, confidence: 100 }),
      created('p2', { grade: 'B-', fairness: 65, confidence: 50 }),
      created('p3', { grade: 'F', fairness: 30, confidence: 40 }),
      created('p4', { grade: null, fairness: null, confidence: null }),
    ])
    expect(a.gradeDistribution).toMatchObject({ aRange: 1, bRange: 1, dfRange: 1, unknown: 1 })
    expect(a.reviewDistribution.lopsidedCount).toBe(1) // fairness 30 < 60
    expect(a.reviewDistribution.highValueDeltaCount).toBe(2) // 65 and 30 < 70
    expect(a.reviewDistribution.lowConfidenceCount).toBe(2) // 50 and 40 < 60
    expect(a.reviewDistribution.reviewRecommendedCount).toBeNull() // deferred
  })

  it('contains no PII', () => {
    const a = computeMarketAggregates([created('p1', { players: ['x'] }), created('p2', {}), created('p3', {})])
    const json = JSON.stringify(a).toLowerCase()
    for (const banned of ['email', 'token', 'session', 'password', '@', 'authorization']) {
      expect(json.includes(banned)).toBe(false)
    }
  })
})
